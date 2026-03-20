import { Injectable, inject, signal, computed } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { Subject } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { Category, Product, Order, AppState, OrderColor } from '../models/catalog.models';
import { NotificationService } from './notification.service';

const COLORS: OrderColor[] = [
  { fg: '#4338ca', bg: '#eef2ff' }, { fg: '#0d9488', bg: '#f0fdfa' },
  { fg: '#d97706', bg: '#fffbeb' }, { fg: '#dc2626', bg: '#fef2f2' },
  { fg: '#059669', bg: '#ecfdf5' }, { fg: '#7c3aed', bg: '#f5f3ff' },
  { fg: '#db2777', bg: '#fdf2f8' }, { fg: '#2563eb', bg: '#eff6ff' },
  { fg: '#b45309', bg: '#fefce8' }, { fg: '#0891b2', bg: '#ecfeff' },
];

const SAMPLE_DATA: AppState = {
  categories: [
    { id: 's1', name: 'Ciuchy', collapsed: false },
    { id: 's2', name: 'Buty', collapsed: false },
    { id: 's3', name: 'Lego', collapsed: false },
  ],
  products: [
    { id: 'p1', catId: 's1', name: 'Kurtka zimowa XL', price: 120, mass: 850, img: '', link: '', desc: 'stan idealny, bez śladów użytkowania' },
    { id: 'p2', catId: 's1', name: 'Bluza Nike M', price: 65, mass: 420, img: '', link: '', desc: 'rozmiar M, kolor granatowy' },
    { id: 'p3', catId: 's2', name: 'Buty Adidas 42', price: 180, mass: 950, img: '', link: '', desc: 'rozmiar 42, mało używane' },
    { id: 'p4', catId: 's3', name: 'Lego Technic 42145', price: 290, mass: 1200, img: '', link: '', desc: 'kompletny zestaw z instrukcją' },
  ],
  orders: [],
};

@Injectable({ providedIn: 'root' })
export class DataService {
  private firestore = inject(Firestore);
  private notify = inject(NotificationService);

  readonly categories = signal<Category[]>([]);
  readonly products = signal<Product[]>([]);
  readonly orders = signal<Order[]>([]);
  readonly syncState = signal<'online' | 'syncing' | 'offline'>('online');

  readonly productCount = computed(() => this.products().length);
  readonly orderCount = computed(() => this.orders().length);

  private uid = '';
  private saveSubject = new Subject<void>();

  constructor() {
    this.saveSubject.pipe(
      debounceTime(800),
      switchMap(() => this.persistToFirestore()),
    ).subscribe();
  }

  async loadData(uid: string): Promise<void> {
    this.uid = uid;
    try {
      const ref = doc(this.firestore, `users/${uid}/katalog`, 'katalog');
      // Try loading from Firestore
      const snap = await getDoc(ref);
      let data: AppState;
      if (snap.exists()) {
        data = snap.data() as AppState;
      } else {
        data = SAMPLE_DATA;
        await setDoc(ref, SAMPLE_DATA);
      }
      this.applyState(data);
      this.syncState.set('online');
      localStorage.setItem('katalog_cache', JSON.stringify(data));
    } catch {
      // Fallback to localStorage
      const cached = localStorage.getItem('katalog_cache');
      if (cached) {
        this.applyState(JSON.parse(cached));
      }
      this.syncState.set('offline');
    }
  }

  clear(): void {
    this.uid = '';
    this.categories.set([]);
    this.products.set([]);
    this.orders.set([]);
    this.syncState.set('online');
  }

  // ── Categories ───────────────────────────────────────────────────
  addCategory(name: string): void {
    this.mutate(() => this.categories.update(cats => [
      ...cats, { id: crypto.randomUUID(), name, collapsed: false }
    ]));
  }

  updateCategory(id: string, name: string): void {
    this.mutate(() => this.categories.update(cats =>
      cats.map(c => c.id === id ? { ...c, name } : c)
    ));
  }

  deleteCategory(id: string): void {
    this.mutate(() => {
      this.categories.update(cats => cats.filter(c => c.id !== id));
      this.products.update(prods => prods.filter(p => p.catId !== id));
    });
  }

  toggleCategoryCollapse(id: string): void {
    this.mutate(() => this.categories.update(cats =>
      cats.map(c => c.id === id ? { ...c, collapsed: !c.collapsed } : c)
    ));
  }

  // ── Products ────────────────────────────────────────────────────
  addProduct(p: Omit<Product, 'id'>): void {
    this.mutate(() => this.products.update(prods => [
      ...prods, { ...p, id: crypto.randomUUID() }
    ]));
  }

  updateProduct(id: string, changes: Partial<Product>): void {
    this.mutate(() => this.products.update(prods =>
      prods.map(p => p.id === id ? { ...p, ...changes } : p)
    ));
  }

  deleteProduct(id: string): void {
    this.mutate(() => this.products.update(prods => prods.filter(p => p.id !== id)));
  }

  // ── Orders ──────────────────────────────────────────────────────
  addOrder(name: string, productIds: string[]): void {
    const colorIndex = this.orders().length % COLORS.length;
    const order: Order = {
      id: crypto.randomUUID(),
      name,
      color: COLORS[colorIndex],
      delivery: 0,
      otherFees: 0,
      items: productIds.map(prodId => ({ prodId, sellPrice: 0 })),
    };
    this.mutate(() => this.orders.update(orders => [...orders, order]));
  }

  updateOrderFee(orderId: string, field: 'delivery' | 'otherFees', value: number): void {
    this.mutate(() => this.orders.update(orders =>
      orders.map(o => o.id === orderId ? { ...o, [field]: value } : o)
    ));
  }

  updateSellPrice(orderId: string, prodId: string, value: number): void {
    this.mutate(() => this.orders.update(orders =>
      orders.map(o => o.id === orderId ? {
        ...o,
        items: o.items.map(it => it.prodId === prodId ? { ...it, sellPrice: value } : it)
      } : o)
    ));
  }

  deleteOrder(id: string): void {
    this.mutate(() => this.orders.update(orders => orders.filter(o => o.id !== id)));
  }

  // ── Import / Export ─────────────────────────────────────────────
  exportJson(): void {
    const state = this.snapshot();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `katalog_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.notify.notify('Backup zapisany');
  }

  importJson(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data: AppState = JSON.parse(e.target!.result as string);
        if (!data.categories || !data.products || !data.orders) throw new Error();
        if (!confirm('Zastąpić bieżące dane importem?')) return;
        this.mutate(() => this.applyState(data));
        this.notify.notify('Import OK');
      } catch {
        this.notify.notify('Błąd — nieprawidłowy plik');
      }
    };
    reader.readAsText(file);
  }

  async exportXlsx(): Promise<void> {
    const XLSX = await import('xlsx');
    const rows: (string | number)[][] = [['Nr', 'Kategoria', 'Nazwa', 'Cena', 'Masa', 'Opis']];
    let n = 0;
    this.categories().forEach(cat => {
      this.products()
        .filter(p => p.catId === cat.id)
        .forEach(p => {
          rows.push([++n, cat.name, p.name, p.price ?? 0, p.mass ?? 0, p.desc ?? '']);
        });
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Katalog');
    XLSX.writeFile(wb, `katalog_${new Date().toISOString().slice(0, 10)}.xlsx`);
    this.notify.notify('Plik XLSX pobrany');
  }

  // ── Internals ───────────────────────────────────────────────────
  private applyState(data: AppState): void {
    this.categories.set(data.categories ?? []);
    this.products.set(data.products ?? []);
    this.orders.set(data.orders ?? []);
  }

  private snapshot(): AppState {
    return {
      categories: this.categories(),
      products: this.products(),
      orders: this.orders(),
    };
  }

  private mutate(fn: () => void): void {
    fn();
    localStorage.setItem('katalog_cache', JSON.stringify(this.snapshot()));
    this.syncState.set('syncing');
    this.saveSubject.next();
  }

  private async persistToFirestore(): Promise<void> {
    if (!this.uid) return;
    try {
      const ref = doc(this.firestore, `users/${this.uid}/katalog`, 'katalog');
      await setDoc(ref, this.snapshot());
      this.syncState.set('online');
    } catch {
      this.syncState.set('offline');
      this.notify.notify('Błąd synchronizacji — dane lokalne zachowane');
    }
  }
}
