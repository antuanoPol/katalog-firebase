export interface Category {
  id: string;
  name: string;
  collapsed: boolean;
}

export interface Product {
  id: string;
  catId: string;
  name: string;
  price: number;
  mass: number;
  img: string;
  imgs?: string[];
  link: string;
  desc: string;
}

export interface OrderItem {
  prodId: string;
  sellPrice: number;
}

export interface OrderColor {
  fg: string;
  bg: string;
}

export interface Order {
  id: string;
  name: string;
  color: OrderColor;
  delivery: number;
  otherFees: number;
  items: OrderItem[];
}

export interface SaleRecord {
  id: string;
  productId: string;
  productName: string;
  productCost: number;
  sellPrice: number;
  date: string; // YYYY-MM-DD
  platform: string;
  orderId?: string; // set when created automatically from an order
}

export interface WatchedItem {
  id: string;
  name: string;
  link?: string;
  listedPrice: number;  // cena wywoławcza ogłoszenia
  soldPrice?: number;   // cena za którą się sprzedało (wpisywana gdy sprzedane)
  status: 'watching' | 'sold' | 'unsold';
  category?: string;
  size?: string;
  brand?: string;
  platform?: string;
  addedDate: string;
  soldDate?: string;
  notes?: string;
}

export interface AppState {
  categories: Category[];
  products: Product[];
  orders: Order[];
  sales?: SaleRecord[];
  watched?: WatchedItem[];
}

export interface OrderRowCalc {
  product: Product;
  item: OrderItem;
  massPercent: number;
  deliveryShare: number;
  otherFeesShare: number;
  totalCost: number;
  profit: number | null;
}
