import { Injectable, inject, signal, computed } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { Subject } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { Category, Product, Order, AppState, OrderColor, SaleRecord } from '../models/catalog.models';
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
  readonly sales = signal<SaleRecord[]>([]);
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
    this.sales.set([]);
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

  duplicateProduct(id: string): void {
    const original = this.products().find(p => p.id === id);
    if (!original) return;
    const copy: Product = { ...original, id: crypto.randomUUID(), name: original.name + ' (kopia)' };
    this.mutate(() => this.products.update(prods => {
      const idx = prods.findIndex(p => p.id === id);
      const next = [...prods];
      next.splice(idx + 1, 0, copy);
      return next;
    }));
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
    this.mutate(() => {
      // 1. Update the order item
      this.orders.update(orders =>
        orders.map(o => o.id === orderId ? {
          ...o,
          items: o.items.map(it => it.prodId === prodId ? { ...it, sellPrice: value } : it)
        } : o)
      );

      // 2. Auto-manage sale record for this order+product
      const ord = this.orders().find(o => o.id === orderId);
      const prod = this.products().find(p => p.id === prodId);
      if (!ord || !prod) return;

      const prods = this.products();
      const totalMass = ord.items.reduce((s, it) => s + (prods.find(x => x.id === it.prodId)?.mass ?? 0), 0);
      const massRatio = totalMass > 0 ? (prod.mass ?? 0) / totalMass : 0;
      const deliveryShare = (ord.delivery ?? 0) * massRatio;
      const otherFeesShare = ord.items.length > 0 ? (ord.otherFees ?? 0) / ord.items.length : 0;
      const totalCost = (prod.price ?? 0) + deliveryShare + otherFeesShare;

      this.sales.update(sales => {
        const idx = sales.findIndex(s => s.orderId === orderId && s.productId === prodId);
        if (value <= 0) {
          return idx >= 0 ? sales.filter((_, i) => i !== idx) : sales;
        }
        const record: SaleRecord = {
          id: idx >= 0 ? sales[idx].id : crypto.randomUUID(),
          productId: prodId,
          productName: prod.name,
          productCost: totalCost,
          sellPrice: value,
          date: idx >= 0 ? sales[idx].date : new Date().toISOString().slice(0, 10),
          platform: idx >= 0 ? sales[idx].platform : 'Inne',
          orderId,
        };
        if (idx >= 0) {
          const next = [...sales];
          next[idx] = record;
          return next;
        }
        return [record, ...sales];
      });
    });
  }

  deleteOrder(id: string): void {
    this.mutate(() => this.orders.update(orders => orders.filter(o => o.id !== id)));
  }

  // ── Sales ────────────────────────────────────────────────────────
  addSale(record: Omit<SaleRecord, 'id'>): void {
    this.mutate(() => this.sales.update(s => [
      { ...record, id: crypto.randomUUID() }, ...s
    ]));
  }

  deleteSale(id: string): void {
    this.mutate(() => this.sales.update(s => s.filter(r => r.id !== id)));
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
        // confirmation handled by caller
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
    this.sales.set(data.sales ?? []);
  }

  private snapshot(): AppState {
    return {
      categories: this.categories(),
      products: this.products(),
      orders: this.orders(),
      sales: this.sales(),
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
