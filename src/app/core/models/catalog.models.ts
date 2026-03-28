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
  watched?: boolean;
}

export interface OrderItem {
  itemId?: string;
  prodId: string;
  sellPrice: number;
}

export interface OrderColor {
  fg: string;
  bg: string;
}

export interface CustomFee {
  id: string;
  name: string;
  amount: number;
}

export interface Order {
  id: string;
  name: string;
  color: OrderColor;
  delivery: number;
  otherFees: number;
  customFees?: CustomFee[];
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

export interface AppState {
  categories: Category[];
  products: Product[];
  orders: Order[];
  sales?: SaleRecord[];
  observedPrices?: Record<string, number[]>;
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
