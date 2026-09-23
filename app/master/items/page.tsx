'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/app/components/layout/AppLayout';
import { DataTable, type Column } from '@/app/components/ui/DataTable';
import { Modal } from '@/app/components/ui/Modal';
import { SearchInput } from '@/app/components/ui/SearchInput';
import { Badge } from '@/app/components/ui/Badge';
import { useI18n } from '@/app/providers';
import { masterService } from '@/lib/api/services/master';
import type { MastItem } from '@/lib/types';

export default function MasterItemPage() {
  const { t } = useI18n();

  // State
  const [items, setItems] = useState<MastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MastItem | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    itemCode: '',
    itemName: '',
    isLotNo: false,
    isSerialNo: false,
    isActive: true,
    uomId: 1, // Default mock UOM
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await masterService.items.list({ search });
      if (res.success) setItems(res.data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => fetchItems(), 300);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ itemCode: '', itemName: '', isLotNo: false, isSerialNo: false, isActive: true, uomId: 1 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MastItem) => {
    setEditingItem(item);
    setFormData({
      itemCode: item.itemCode,
      itemName: item.itemName,
      isLotNo: item.isLotNo,
      isSerialNo: item.isSerialNo,
      isActive: item.isActive,
      uomId: item.uomId,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (item: MastItem) => {
    if (confirm(`ต้องการลบสินค้า ${item.itemCode} หรือไม่?`)) {
      await masterService.items.remove(item.id);
      fetchItems();
    }
  };

  const handleSave = async () => {
    try {
      const payload: Omit<MastItem, 'id' | 'createDate' | 'updateDate'> = {
        itemCode: formData.itemCode,
        itemName: formData.itemName,
        isLotNo: formData.isLotNo,
        isSerialNo: formData.isSerialNo,
        isActive: formData.isActive,
        uomId: formData.uomId,
        brandId: 1,
        groupId: 1,
        minAlter: 0,
        maxAlter: 100,
        locationId: 1,
        buyPrice: 0,
        sellPrice: 0,
        isDelete: false,
        createBy: 'admin',
        updateBy: 'admin',
      };

      if (editingItem) {
        await masterService.items.update(editingItem.id, payload);
      } else {
        await masterService.items.create(payload);
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (error) {
      console.error('Save failed:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // Table Columns Setup
  const columns: Column<MastItem>[] = [
    { key: 'itemCode', label: t.master.item.itemCode, sortable: true },
    { key: 'itemName', label: t.master.item.itemName, sortable: true },
    {
      key: 'isLotNo',
      label: 'Lot Control',
      render: (val) => val ? <Badge label="Yes" variant="info" /> : <Badge label="No" variant="secondary" />
    },
    {
      key: 'isSerialNo',
      label: 'Serial Control',
      render: (val) => val ? <Badge label="Yes" variant="purple" /> : <Badge label="No" variant="secondary" />
    },
    {
      key: 'isActive',
      label: 'สถานะ',
      render: (val) => val ? <Badge label="Active" variant="success" /> : <Badge label="Inactive" variant="danger" />
    },
  ];

  return (
    <AppLayout>
      {/* Header Section */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.master.item.title}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>จัดการข้อมูลรหัสสินค้าทั้งหมดในระบบ</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="ค้นหารหัส หรือ ชื่อสินค้า..." className="w-64" />
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: 'var(--accent)' }}
          >
            + สร้างสินค้าใหม่
          </button>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      {/* Create / Edit Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `แก้ไขสินค้า: ${editingItem.itemCode}` : 'สร้างสินค้าใหม่'}
        size="md"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors border"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              บันทึกข้อมูล
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>รหัสสินค้า (Item Code)</label>
            <input
              type="text"
              value={formData.itemCode}
              onChange={e => setFormData({ ...formData, itemCode: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500/50 outline-none"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>ชื่อสินค้า (Item Name)</label>
            <input
              type="text"
              value={formData.itemName}
              onChange={e => setFormData({ ...formData, itemName: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500/50 outline-none"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={formData.isLotNo}
                onChange={e => setFormData({ ...formData, isLotNo: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              ควบคุม Lot
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={formData.isSerialNo}
                onChange={e => setFormData({ ...formData, isSerialNo: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              ควบคุม Serial
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              ใช้งาน
            </label>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
