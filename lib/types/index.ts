// ============================================================
// WMS Type Definitions — aligned with Design_DB_V1.xlsx
// ============================================================

// ─── Common base ────────────────────────────────────────────
export interface BaseEntity {
  id: number;
  isActive: boolean;
  isDelete: boolean;
  createDate: string;
  createBy: string;
  updateDate: string;
  updateBy: string;
}

// ─── Master Data ─────────────────────────────────────────────

export interface MastItem extends BaseEntity {
  itemCode: string;
  itemName: string;
  brandId: number;
  minAlter: number;
  maxAlter: number;
  uomId: number;
  locationId: number;
  buyPrice: number;
  sellPrice: number;
  isLotNo: boolean;
  isSerialNo: boolean;
  groupId?: number;
  warehouseId?: number;
}

export interface MastBrand extends BaseEntity {
  nameTh: string;
  nameEn: string;
}

export interface MastGroup extends BaseEntity {
  nameTh: string;
  nameEn: string;
}

export interface MastItemGroup {
  id: number;
  itemId: number;
  groupId: number;
  isActive: boolean;
  isDelete: boolean;
  createDate: string;
  createBy: string;
  updateDate: string;
  updateBy: string;
}

export interface MastLocation extends BaseEntity {
  code: string;
  name: string;
}

export interface MastWarehouse extends BaseEntity {
  code: string;
  warehouseName: string;
  description: string;
}

export interface MastItemWarehouse {
  id: number;
  itemId: number;
  warehouseId: number;
  isActive: boolean;
  isDelete: boolean;
  createDate: string;
  createBy: string;
  updateDate: string;
  updateBy: string;
}

export interface MastUom extends BaseEntity {
  name: string;
}

export interface MastVendor extends BaseEntity {
  vendCode: string;
  vendName: string;
  contactName: string;
  tel: string;
  address: string;
  remark: string;
}

export interface MastCustomer extends BaseEntity {
  custCode: string;
  custName: string;
  contactName: string;
  tel: string;
  address: string;
  remark: string;
}

export interface MastEmployee extends BaseEntity {
  empCode: string;
  fName: string;
  lName: string;
  tel: string;
}

export interface MastStatus extends BaseEntity {
  transTypeId: number;
  nameTh: string;
  nameEn: string;
  orderNo: number;
}

export interface MastDocType extends BaseEntity {
  transTypeId: number;
  name: string;
}

export interface MastReason extends BaseEntity {
  name: string;
}

export interface MastTransType extends BaseEntity {
  name: string;
}

// ─── Transactions ────────────────────────────────────────────

export interface DocReceive extends BaseEntity {
  docNo: string;
  docTypeId: number;
  statusId: number;
  warehouseId: number;
  vendorId: number;
  remark?: string;
}

export interface DocReceiveDetail extends BaseEntity {
  docId: number;
  itemId: number;
  itemName: string;
  uomId: number;
  itemQty: number;
}

export interface DocIssue extends BaseEntity {
  docNo: string;
  docTypeId: number;
  statusId: number;
  warehouseId: number;
  customerId: number;
  remark?: string;
}

export interface DocIssueDetail extends BaseEntity {
  docId: number;
  itemId: number;
  itemName: string;
  uomId: number;
  itemQty: number;
  bookingQty: number;
}

export interface DocRequest extends BaseEntity {
  docNo: string;
  statusId: number;
  fromLocationId: number;
  toWarehouseId: number;
  employeeId: number;
  remark?: string;
}

export interface DocRequestDetail extends BaseEntity {
  docId: number;
  invId: number;
  itemQty: number;
  pickingQty: number;
  returnQty: number;
}

export interface DocRequestPicking extends BaseEntity {
  docId: number;
  itemDetailId: number;
  pickingQty: number;
}

export interface ReqTransLog extends BaseEntity {
  docId: number;
  fromStatusId: number;
  toStatusId: number;
  fromUserId: number;
  toUserId: number;
  remark?: string;
}

export interface DocReturn extends BaseEntity {
  docId: number;
  invId: number;
  itemQty: number;
  reasonId: number;
}

export interface DocTransfer extends BaseEntity {
  docNo: string;
  fromWarehouseId: number;
  toWarehouseId: number;
  statusId: number;
  remark?: string;
}

export interface DocTransferFromDetail extends BaseEntity {
  docId: number;
  invId: number;
  itemQty: number;
  pickingQty: number;
}

export interface DocTransferToDetail extends BaseEntity {
  docId: number;
  invId: number;
  itemQty: number;
  putawayQty: number;
  locationId: number;
  newInvId: number;
}

export interface DocDisposal extends BaseEntity {
  docNo: string;
  statusId: number;
  warehouseId: number;
  remark?: string;
}

export interface DocDisposalDetail extends BaseEntity {
  docId: number;
  invDmgId: number;
  itemQty: number;
}

// ─── Inventory ───────────────────────────────────────────────

export interface Inventory extends BaseEntity {
  itemId: number;
  lotNo: string;
  serialNo: string;
  itemQty: number;
  itemPrice: number;
  locationId: number;
  mfgDate: string;
  expireDate: string;
  warehouseId: number;
}

export interface InventoryDamage extends BaseEntity {
  docId: number;
  invId: number;
  itemQty: number;
  locationId: number;
  reasonId: number;
  warehouseId: number;
}

export interface InventoryDamageLog extends BaseEntity {
  invDmgId: number;
  itemQty: number;
  moveLocationId: number;
}

export interface InvMoveLog extends BaseEntity {
  invId: number;
  oldLocationId: number;
  newLocationId: number;
  itemQty: number;
}

// ─── Authentication ──────────────────────────────────────────

export interface UserProfile extends BaseEntity {
  fName: string;
  lName: string;
  tel: string;
  address: string;
  email: string;
}

export interface UserAuthen extends BaseEntity {
  userId: number;
  username: string;
  password: string;
  plaintext: string;
}

export interface SysRole extends BaseEntity {
  menuId: number;
  nameTh: string;
  nameEn: string;
  isAdmin: boolean;
}

export interface SysRoleMenu extends BaseEntity {
  userId: number;
  roleId: number;
  canView: boolean;
  canCreate: boolean;
  canApprove: boolean;
}

export interface SysMenu extends BaseEntity {
  parentId: number | null;
  nameTh: string;
  nameEn: string;
}

// ─── Joined / View types for UI ──────────────────────────────

export interface MastItemView extends MastItem {
  brandName?: string;
  uomName?: string;
  locationName?: string;
  warehouseName?: string;
  groupName?: string;
}

export interface InventoryView extends Inventory {
  itemCode?: string;
  itemName?: string;
  locationName?: string;
  warehouseName?: string;
  uomName?: string;
}

export interface DocReceiveView extends DocReceive {
  vendorName?: string;
  warehouseName?: string;
  statusName?: string;
  docTypeName?: string;
}

export interface DocIssueView extends DocIssue {
  customerName?: string;
  warehouseName?: string;
  statusName?: string;
  docTypeName?: string;
}

export interface DocTransferView extends DocTransfer {
  fromWarehouseName?: string;
  toWarehouseName?: string;
  statusName?: string;
}

export interface DocRequestView extends DocRequest {
  employeeName?: string;
  fromLocationName?: string;
  toWarehouseName?: string;
  statusName?: string;
}

export interface DocDisposalView extends DocDisposal {
  warehouseName?: string;
  statusName?: string;
}

// ─── API Response wrapper ────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

// ─── Auth ────────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile & { username: string; role: string; isAdmin: boolean };
}

export interface CurrentUser {
  id: number;
  username: string;
  fName: string;
  lName: string;
  email: string;
  role: string;
  isAdmin: boolean;
}

