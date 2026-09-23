import type {
  MastItem, MastBrand, MastGroup, MastLocation, MastWarehouse, MastUom,
  MastVendor, MastCustomer, MastEmployee, MastStatus, MastDocType,
  MastReason, MastTransType,
  DocReceive, DocReceiveDetail, DocIssue, DocIssueDetail,
  DocRequest, DocTransfer, DocDisposal,
  Inventory, InventoryDamage,
  UserProfile,
} from '../types';

const now = new Date().toISOString();
const by = 'admin';

// ─── Master ──────────────────────────────────────────────────

export const brands: MastBrand[] = [
  { id: 1, nameTh: 'ซัมซุง', nameEn: 'Samsung', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 2, nameTh: 'แอปเปิล', nameEn: 'Apple', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 3, nameTh: 'เดลล์', nameEn: 'Dell', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 4, nameTh: 'เอชพี', nameEn: 'HP', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
];

export const groups: MastGroup[] = [
  { id: 1, nameTh: 'อิเล็กทรอนิกส์', nameEn: 'Electronics', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 2, nameTh: 'คอมพิวเตอร์', nameEn: 'Computers', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 3, nameTh: 'อุปกรณ์เสริม', nameEn: 'Accessories', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
];

export const uoms: MastUom[] = [
  { id: 1, name: 'ชิ้น', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 2, name: 'กล่อง', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 3, name: 'โหล', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 4, name: 'ชุด', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
];

export const warehouses: MastWarehouse[] = [
  { id: 1, code: 'WH01', warehouseName: 'คลังกลาง', description: 'คลังสินค้าหลัก', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 2, code: 'WH02', warehouseName: 'คลังสาขา A', description: 'คลังสาขา ภาคเหนือ', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 3, code: 'WH03', warehouseName: 'คลังสาขา B', description: 'คลังสาขา ภาคใต้', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
];

export const locations: MastLocation[] = [
  { id: 1, code: 'A-01-01', name: 'ชั้น A แถว 01 ช่อง 01', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 2, code: 'A-01-02', name: 'ชั้น A แถว 01 ช่อง 02', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 3, code: 'B-01-01', name: 'ชั้น B แถว 01 ช่อง 01', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 4, code: 'B-02-01', name: 'ชั้น B แถว 02 ช่อง 01', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 5, code: 'C-01-01', name: 'ชั้น C แถว 01 ช่อง 01', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
];

export const vendors: MastVendor[] = [
  { id: 1, vendCode: 'V001', vendName: 'บริษัท ไทยเทค จำกัด', contactName: 'คุณสมชาย', tel: '02-111-1111', address: '123 ถ.พระราม 4 กทม.', remark: '', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 2, vendCode: 'V002', vendName: 'บริษัท อิเล็คทรา จำกัด', contactName: 'คุณมานี', tel: '02-222-2222', address: '456 ถ.สุขุมวิท กทม.', remark: '', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 3, vendCode: 'V003', vendName: 'ห้างหุ้นส่วน แม็กซ์ซัพพลาย', contactName: 'คุณวิชัย', tel: '053-333-333', address: '789 ถ.นิมมาน เชียงใหม่', remark: '', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
];

export const customers: MastCustomer[] = [
  { id: 1, custCode: 'C001', custName: 'บริษัท ซีเนอร์ยี่ จำกัด', contactName: 'คุณอรทัย', tel: '02-444-4444', address: '10 ถ.รัชดาภิเษก กทม.', remark: '', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 2, custCode: 'C002', custName: 'บริษัท โปรเทค จำกัด', contactName: 'คุณประภาส', tel: '02-555-5555', address: '20 ถ.ลาดพร้าว กทม.', remark: '', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 3, custCode: 'C003', custName: 'ร้าน ไอที คอร์เนอร์', contactName: 'คุณกมล', tel: '076-666-666', address: '30 ถ.ราษฎร์ อุทิศ ภูเก็ต', remark: '', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
];

export const items: MastItem[] = [
  { id: 1, itemCode: 'ITM001', itemName: 'โน๊ตบุ๊ค Dell Inspiron 15', brandId: 3, minAlter: 5, maxAlter: 50, uomId: 1, locationId: 1, buyPrice: 18000, sellPrice: 22000, isLotNo: false, isSerialNo: true, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 2, itemCode: 'ITM002', itemName: 'iPhone 15 Pro 256GB', brandId: 2, minAlter: 3, maxAlter: 30, uomId: 1, locationId: 2, buyPrice: 35000, sellPrice: 42000, isLotNo: false, isSerialNo: true, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 3, itemCode: 'ITM003', itemName: 'Samsung Galaxy S24', brandId: 1, minAlter: 5, maxAlter: 40, uomId: 1, locationId: 2, buyPrice: 28000, sellPrice: 33000, isLotNo: false, isSerialNo: true, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 4, itemCode: 'ITM004', itemName: 'เมาส์ไร้สาย HP', brandId: 4, minAlter: 10, maxAlter: 100, uomId: 1, locationId: 3, buyPrice: 350, sellPrice: 550, isLotNo: false, isSerialNo: false, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 5, itemCode: 'ITM005', itemName: 'คีย์บอร์ด Dell', brandId: 3, minAlter: 10, maxAlter: 80, uomId: 1, locationId: 3, buyPrice: 450, sellPrice: 680, isLotNo: false, isSerialNo: false, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 6, itemCode: 'ITM006', itemName: 'จอมอนิเตอร์ 24" Samsung', brandId: 1, minAlter: 3, maxAlter: 20, uomId: 1, locationId: 4, buyPrice: 4500, sellPrice: 6200, isLotNo: false, isSerialNo: true, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 7, itemCode: 'ITM007', itemName: 'RAM DDR5 16GB', brandId: 1, minAlter: 20, maxAlter: 200, uomId: 1, locationId: 5, buyPrice: 1800, sellPrice: 2400, isLotNo: true, isSerialNo: false, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
];

export const transTypes: MastTransType[] = [
  { id: 1, name: 'Receive', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 2, name: 'Issue', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 3, name: 'Transfer', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 4, name: 'Request', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 5, name: 'Disposal', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
];

export const statuses: MastStatus[] = [
  { id: 1, transTypeId: 1, nameTh: 'ร่าง', nameEn: 'Draft', orderNo: 1, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 2, transTypeId: 1, nameTh: 'รอรับ', nameEn: 'Pending', orderNo: 2, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 3, transTypeId: 1, nameTh: 'รับแล้ว', nameEn: 'Completed', orderNo: 3, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 4, transTypeId: 2, nameTh: 'ร่าง', nameEn: 'Draft', orderNo: 1, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 5, transTypeId: 2, nameTh: 'รอจ่าย', nameEn: 'Pending', orderNo: 2, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 6, transTypeId: 2, nameTh: 'จ่ายแล้ว', nameEn: 'Completed', orderNo: 3, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 7, transTypeId: 3, nameTh: 'ร่าง', nameEn: 'Draft', orderNo: 1, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 8, transTypeId: 3, nameTh: 'โอนแล้ว', nameEn: 'Completed', orderNo: 2, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
];

export const docTypes: MastDocType[] = [
  { id: 1, transTypeId: 1, name: 'ใบรับสินค้าปกติ', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 2, transTypeId: 1, name: 'ใบรับคืน', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 3, transTypeId: 2, name: 'ใบจ่ายสินค้าปกติ', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 4, transTypeId: 2, name: 'ใบจ่ายสินค้าเสีย', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
];

export const reasons: MastReason[] = [
  { id: 1, name: 'สินค้าชำรุด', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 2, name: 'สินค้าหมดอายุ', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 3, name: 'สินค้าสูญหาย', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 4, name: 'คุณภาพต่ำกว่ามาตรฐาน', isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
];

// ─── Transactions ─────────────────────────────────────────────

export const docReceives: DocReceive[] = [
  { id: 1, docNo: 'GR2024001', docTypeId: 1, statusId: 3, warehouseId: 1, vendorId: 1, isActive: true, isDelete: false, createDate: '2024-01-10T10:00:00Z', createBy: by, updateDate: '2024-01-10T14:00:00Z', updateBy: by },
  { id: 2, docNo: 'GR2024002', docTypeId: 1, statusId: 2, warehouseId: 1, vendorId: 2, isActive: true, isDelete: false, createDate: '2024-01-15T09:00:00Z', createBy: by, updateDate: '2024-01-15T09:00:00Z', updateBy: by },
  { id: 3, docNo: 'GR2024003', docTypeId: 1, statusId: 1, warehouseId: 2, vendorId: 1, isActive: true, isDelete: false, createDate: '2024-01-20T11:00:00Z', createBy: by, updateDate: '2024-01-20T11:00:00Z', updateBy: by },
];

export const docReceiveDetails: DocReceiveDetail[] = [
  { id: 1, docId: 1, itemId: 1, itemName: 'โน๊ตบุ๊ค Dell Inspiron 15', uomId: 1, itemQty: 10, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 2, docId: 1, itemId: 4, itemName: 'เมาส์ไร้สาย HP', uomId: 1, itemQty: 20, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 3, docId: 2, itemId: 2, itemName: 'iPhone 15 Pro 256GB', uomId: 1, itemQty: 5, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
];

export const docIssues: DocIssue[] = [
  { id: 1, docNo: 'GI2024001', docTypeId: 3, statusId: 6, warehouseId: 1, customerId: 1, isActive: true, isDelete: false, createDate: '2024-01-12T10:00:00Z', createBy: by, updateDate: '2024-01-12T16:00:00Z', updateBy: by },
  { id: 2, docNo: 'GI2024002', docTypeId: 3, statusId: 5, warehouseId: 1, customerId: 2, isActive: true, isDelete: false, createDate: '2024-01-18T09:00:00Z', createBy: by, updateDate: '2024-01-18T09:00:00Z', updateBy: by },
];

export const docIssueDetails: DocIssueDetail[] = [
  { id: 1, docId: 1, itemId: 4, itemName: 'เมาส์ไร้สาย HP', uomId: 1, itemQty: 5, bookingQty: 5, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 2, docId: 2, itemId: 5, itemName: 'คีย์บอร์ด Dell', uomId: 1, itemQty: 3, bookingQty: 3, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
];

export const docTransfers: DocTransfer[] = [
  { id: 1, docNo: 'TRF2024001', fromWarehouseId: 1, toWarehouseId: 2, statusId: 8, isActive: true, isDelete: false, createDate: '2024-01-14T10:00:00Z', createBy: by, updateDate: '2024-01-14T15:00:00Z', updateBy: by },
  { id: 2, docNo: 'TRF2024002', fromWarehouseId: 1, toWarehouseId: 3, statusId: 7, isActive: true, isDelete: false, createDate: '2024-01-22T10:00:00Z', createBy: by, updateDate: '2024-01-22T10:00:00Z', updateBy: by },
];

export const docRequests: DocRequest[] = [
  { id: 1, docNo: 'REQ2024001', statusId: 2, fromLocationId: 1, toWarehouseId: 1, employeeId: 1, isActive: true, isDelete: false, createDate: '2024-01-13T09:00:00Z', createBy: by, updateDate: '2024-01-13T09:00:00Z', updateBy: by },
  { id: 2, docNo: 'REQ2024002', statusId: 3, fromLocationId: 2, toWarehouseId: 1, employeeId: 1, isActive: true, isDelete: false, createDate: '2024-01-16T14:00:00Z', createBy: by, updateDate: '2024-01-16T16:00:00Z', updateBy: by },
];

export const docDisposals: DocDisposal[] = [
  { id: 1, docNo: 'DSP2024001', statusId: 3, warehouseId: 1, isActive: true, isDelete: false, createDate: '2024-01-11T10:00:00Z', createBy: by, updateDate: '2024-01-11T14:00:00Z', updateBy: by },
];

// ─── Inventory ─────────────────────────────────────────────

export const inventories: Inventory[] = [
  { id: 1, itemId: 1, lotNo: '', serialNo: 'SN-DELL-001', itemQty: 8, itemPrice: 18000, locationId: 1, mfgDate: '2023-06-01', expireDate: '', warehouseId: 1, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 2, itemId: 1, lotNo: '', serialNo: 'SN-DELL-002', itemQty: 2, itemPrice: 18000, locationId: 1, mfgDate: '2023-06-01', expireDate: '', warehouseId: 1, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 3, itemId: 2, lotNo: '', serialNo: 'SN-IPH-001', itemQty: 5, itemPrice: 35000, locationId: 2, mfgDate: '2023-09-01', expireDate: '', warehouseId: 1, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 4, itemId: 3, lotNo: '', serialNo: 'SN-SAM-001', itemQty: 3, itemPrice: 28000, locationId: 2, mfgDate: '2023-08-01', expireDate: '', warehouseId: 1, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 5, itemId: 4, lotNo: '', serialNo: '', itemQty: 3, itemPrice: 350, locationId: 3, mfgDate: '2023-01-01', expireDate: '', warehouseId: 1, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 6, itemId: 5, lotNo: '', serialNo: '', itemQty: 12, itemPrice: 450, locationId: 3, mfgDate: '2023-01-01', expireDate: '', warehouseId: 1, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 7, itemId: 6, lotNo: '', serialNo: 'SN-MON-001', itemQty: 6, itemPrice: 4500, locationId: 4, mfgDate: '2023-05-01', expireDate: '', warehouseId: 1, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 8, itemId: 7, lotNo: 'LOT2024001', serialNo: '', itemQty: 50, itemPrice: 1800, locationId: 5, mfgDate: '2024-01-01', expireDate: '2026-01-01', warehouseId: 1, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
];

export const inventoryDamages: InventoryDamage[] = [
  { id: 1, docId: 1, invId: 5, itemQty: 2, locationId: 3, reasonId: 1, warehouseId: 1, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
];

// ─── Auth (mock) ────────────────────────────────────────────

export const users: (UserProfile & { username: string; password: string; role: string; isAdmin: boolean })[] = [
  { id: 1, fName: 'สมชาย', lName: 'ใจดี', tel: '081-111-1111', address: 'กรุงเทพฯ', email: 'admin@wms.local', username: 'admin', password: 'admin1234', role: 'Administrator', isAdmin: true, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
  { id: 2, fName: 'สมหญิง', lName: 'รักงาน', tel: '082-222-2222', address: 'กรุงเทพฯ', email: 'staff@wms.local', username: 'staff', password: 'staff1234', role: 'Staff', isAdmin: false, isActive: true, isDelete: false, createDate: now, createBy: by, updateDate: now, updateBy: by },
];

// ─── Dashboard summary ───────────────────────────────────────

export const getDashboardStats = () => ({
  totalItems: items.length,
  totalStock: inventories.reduce((s, i) => s + i.itemQty, 0),
  lowStock: items.filter(item => {
    const stock = inventories.filter(inv => inv.itemId === item.id).reduce((s, i) => s + i.itemQty, 0);
    return stock < item.minAlter;
  }).length,
  pendingDocs: [
    ...docReceives.filter(d => d.statusId === 2),
    ...docIssues.filter(d => d.statusId === 5),
    ...docTransfers.filter(d => d.statusId === 7),
    ...docRequests.filter(d => d.statusId === 2),
  ].length,
  totalValue: inventories.reduce((s, inv) => s + inv.itemQty * inv.itemPrice, 0),
  todayReceive: docReceives.length,
  todayIssue: docIssues.length,
});

