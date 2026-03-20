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

export interface AppState {
  categories: Category[];
  products: Product[];
  orders: Order[];
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
