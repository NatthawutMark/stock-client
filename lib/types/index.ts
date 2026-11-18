// ============================================================
// WMS Type Definitions — aligned with Design_DB_V1.xlsx
// All IDs are String GUIDs
// ============================================================

// ─── Common base ────────────────────────────────────────────
export interface BaseEntity {
    id?: string;
    isActive?: boolean;
    isDelete?: boolean;
    createDate?: string;
    createBy?: string;
    updateDate?: string;
    updateBy?: string;
}

// ─── Master Data ─────────────────────────────────────────────

export interface MastItem extends BaseEntity {
    itemCode?: string;
    itemName?: string;
    brandId?: string;
    brandName?: string;
    minAlert?: number;
    maxAlert?: number;
    uomId?: string;
    uomName?: string;
    locationId?: string;
    locationName?: string;
    buyPrice?: number;
    sellPrice?: number;
    isLotNo?: boolean;
    isSerialNo?: boolean;
    groupId?: string;
    warehouseId?: string;
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
    id?: string;
    itemId?: string;
    groupId?: string;
    isActive?: boolean;
    isDelete?: boolean;
    createDate?: string;
    createBy?: string;
    updateDate?: string;
    updateBy?: string;
}

export interface MastLocation extends BaseEntity {
    code?: string;
    name?: string;
    warehouseId?: string;
}

export interface MastLocationParams extends PaginationParams {
    code?: string;
    warehouseId?: string;
}

export interface MastWarehouse extends BaseEntity {
    code: string;
    warehouseName: string;
    description?: string;
}

export interface MastItemWarehouse {
    id?: string;
    itemId?: string;
    warehouseId?: string;
    isActive?: boolean;
    isDelete?: boolean;
    createDate?: string;
    createBy?: string;
    updateDate?: string;
    updateBy?: string;
}

export interface MastUom extends BaseEntity {
    name: string;
}

export interface MastVendor extends BaseEntity {
    vendCode: string;
    vendName: string;
    contactName?: string;
    tel?: string;
    address?: string;
    remark?: string;
}

export interface MastCustomer extends BaseEntity {
    custCode: string;
    custName: string;
    contactName?: string;
    tel?: string;
    address?: string;
    remark?: string;
}

export interface MastEmployee extends BaseEntity {
    empCode: string;
    fName: string;
    lName: string;
    tel?: string;
    email?: string;
    position?: string;
    department?: string;
    remark?: string;
}

export interface MastStatus extends BaseEntity {
    transTypeId: string;
    nameTh: string;
    nameEn: string;
    orderNo: number;
}

export interface MastDocType extends BaseEntity {
    docTypeId?: string;
    transTypeId?: string;
    menuId?: string;
    menuName?: string;
    transTypeName?: string;
    transName?: string;
    name?: string;
    docTypeName?: string;
}

export interface MastReason extends BaseEntity {
    name: string;
}

export interface MastTransType extends BaseEntity {
    menuId?: string;
    menuName?: string;
    transTypeId?: string;
    transTypeName?: string;
    name?: string;
    nameTh?: string;
    nameEn?: string;
}

// ─── Transactions ────────────────────────────────────────────

export interface DocTrans extends Partial<BaseEntity>, PaginationParams {
    docNo?: string;
    docDate?: string;
    docNoRef?: string;
    refDocNo?: string;
    empId?: string;
    empName?: string;
    vendId?: string;
    vendName?: string;
    custId?: string;
    custName?: string;
    menuId?: string;
    menuName?: string;
    statusId?: string;
    statusCode?: string;
    statusNameTh?: string;
    statusNameEn?: string;
    statusName?: string;
    docTypeId?: string;
    docTypeName?: string;
    warehouseId?: string;
    warehouseName?: string;
    bookingId?: string | null;
    docIssueReturnId?: string | null;
    transferFromWarehouseId?: string | null;
    transferFromWarehouseName?: string | null;
    transferToWarehouseId?: string | null;
    transferToWarehouseName?: string | null;
    remark?: string;
    isQualityControl?: boolean;
    startDate?: string;
    endDate?: string;
    logs?: unknown;
}

export interface DocReceive extends BaseEntity {
    id?: string;
    docNo?: string;
    docDate?: string;
    refDocNo?: string;
    empId?: string;
    empName?: string;
    docTypeId?: string;
    menuId?: string;
    menuName?: string;
    statusId?: string;
    statusCode?: string;
    statusName?: string;
    warehouseId?: string;
    warehouseName?: string;
    vendId?: string;
    vendName?: string;
    remark?: string;
    details?: DocReceiveDetail[];
}

export interface DocReceiveDetail extends BaseEntity {
    id?: string;
    docId?: string;
    invId?: string;
    itemId?: string;
    itemCode?: string;
    itemName?: string;
    uomId?: string;
    uomName?: string;
    itemQty?: number;
    putawayQty?: number;
    itemPrice?: number;
    totalPrice?: number;
    lotNo?: string;
    serialNo?: string;
    isLotNo?: boolean;
    isSerialNo?: boolean;
    mfgDate?: string;
    expireDate?: string;
    locationId?: string;
    locationName?: string;
    remark?: string;
}

export interface DocIssue extends BaseEntity {
    id?: string;
    docNo?: string;
    docDate?: string;
    refDocNo?: string;
    bookingId?: string;
    empId?: string;
    empName?: string;
    docTypeId?: string;
    menuId?: string;
    menuName?: string;
    statusId?: string;
    statusCode?: string;
    statusName?: string;
    warehouseId?: string;
    warehouseName?: string;
    custId?: string;
    custName?: string;
    remark?: string;
    details?: DocIssueDetail[];
}

export interface DocIssueDetail extends BaseEntity {
    id?: string;
    docId?: string;
    invId?: string;
    itemId?: string;
    itemCode?: string;
    itemName?: string;
    bookingQty: number;
    uomId?: string;
    uomName?: string;
    itemQty?: number;
    pickingQty?: number;
    itemPrice?: number;
    totalPrice?: number;
    lotNo?: string;
    serialNo?: string;
    isLotNo?: boolean;
    isSerialNo?: boolean;
    mfgDate?: string;
    expireDate?: string;
    locationId?: string;
    locationName?: string;
    remark?: string;
}

export interface DocRequest extends BaseEntity {
    docNo: string;
    statusId: string;
    fromLocationId: string;
    toWarehouseId: string;
    empId: string;
    remark?: string;
}

export interface DocRequestDetail extends BaseEntity {
    docId: string;
    invId: string;
    itemQty: number;
    pickingQty: number;
    returnQty: number;
}

export interface DocRequestPicking extends BaseEntity {
    docId: string;
    itemDetailId: string;
    pickingQty: number;
}

export interface ReqTransLog extends BaseEntity {
    docId: string;
    fromStatusId: string;
    toStatusId: string;
    fromUserId: string;
    toUserId: string;
    remark?: string;
}

export interface DocReturn extends BaseEntity {
    docId: string;
    invId: string;
    itemQty: number;
    reasonId: string;
}

export interface DocTransfer extends BaseEntity {
    docNo: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    statusId: string;
    remark?: string;
}

export interface DocTransferFromDetail extends BaseEntity {
    docId: string;
    invId: string;
    itemQty: number;
    pickingQty: number;
}

export interface DocTransferToDetail extends BaseEntity {
    docId: string;
    invId: string;
    itemQty: number;
    putawayQty: number;
    locationId: string;
    newInvId: string;
}

export interface DocDisposal extends BaseEntity {
    docNo: string;
    statusId: string;
    warehouseId: string;
    remark?: string;
}

export interface DocDisposalDetail extends BaseEntity {
    docId: string;
    invDmgId: string;
    itemQty: number;
}

// ─── Inventory ───────────────────────────────────────────────

export interface Inventory extends BaseEntity {
    itemId: string;
    lotNo: string;
    serialNo: string;
    itemQty: number;
    itemPrice: number;
    locationId: string;
    mfgDate: string;
    expireDate: string;
    warehouseId: string;
}

export interface InventoryDamage extends BaseEntity {
    docId: string;
    invId: string;
    itemQty: number;
    locationId: string;
    reasonId: string;
    warehouseId: string;
}

export interface InventoryDamageLog extends BaseEntity {
    invDmgId: string;
    itemQty: number;
    moveLocationId: string;
}

export interface InvMoveLog extends BaseEntity {
    invId: string;
    oldLocationId: string;
    newLocationId: string;
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
    userId: string;
    username: string;
    password: string;
    plaintext: string;
}

export interface SysRole extends BaseEntity {
    menuId: string;
    nameTh: string;
    nameEn: string;
    isAdmin: boolean;
}

export interface SysRoleMenu extends BaseEntity {
    userId: string;
    roleId: string;
    canView: boolean;
    canCreate: boolean;
    canApprove: boolean;
}

export interface SysMenu extends BaseEntity {
    parentId: string | null;
    nameTh: string;
    nameEn: string;
    menuType: string;
    orderNo: number;
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

// ─── Paginated Result Wrapper ───────────────────────────────
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page?: number;
    size?: number;
    pageSize?: number;
    limit?: number;
    [key: string]: unknown;
}

// ─── API Response wrapper ────────────────────────────────────

export interface ApiResponse<T = unknown> {
    success: boolean;
    results?: T;
    data?: T;
    message?: string;
    error?: string;
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: unknown;
}

export type PaginatedApiResponse<T> = ApiResponse<PaginatedResult<T>>;

export interface PaginationParams {
    page?: number;
    size?: number;
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
    token?: string;
    accessToken?: string;
    refreshToken?: string;
    AccessToken?: string;
    RefreshToken?: string;
    response?: CurrentUser;
    user?: UserProfile & { username: string; role: string; isAdmin: boolean };
}

export interface CurrentUser {
    username: string;
    fName: string;
    lName: string;
    email: string;
    role: Role;
    menus: Menus[];
    isAdmin: boolean;
}

export interface Role {
    roleId: string;
    roleTh: string;
    roleEn: boolean;
}

export interface Menus {
    menuID: string;
    parentID: string;
    NameTh: string;
    NameEn: string;
    isActive: boolean;
    subMenus: Menus[];
}

export interface Token {
    accessToken: string;
    refreshToken: string;
}
