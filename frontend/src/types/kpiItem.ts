export interface KpiItem {
  id: number;
  name: string;
  kpiCategoryId: number;
  kpiCategoryName: string;
}

export interface KpiItemRequest {
  name: string;
  kpiCategoryId: number;
}
