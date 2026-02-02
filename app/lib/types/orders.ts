// Order types for the dashboard

export interface Order {
  order_id: string;
  user_email: string;
  client: string;
  report_category: 'Suburb' | 'Property';
  location: string;
  pdf_report: string;
  url: string;
  date: string;
}

export interface OrderStats {
  totalOrders: number;
  suburbReports: number;
  propertyReports: number;
  uniqueLocations: number;
}

export interface OrdersResponse {
  orders: Order[];
  stats: OrderStats;
}

export type SortField = 'date' | 'location' | 'report_category' | 'user_email' | '';
export type SortOrder = 'asc' | 'desc';

export interface SortState {
  field: SortField;
  order: SortOrder;
}

export interface FilterState {
  location: string;
  userEmail: string;
  client: string;
  orderId: string;
}
