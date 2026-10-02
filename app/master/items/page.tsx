'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/app/components/layout/AppLayout';
import { DataTable, type Column } from '@/app/components/ui/DataTable';
import { Modal } from '@/app/components/ui/Modal';
import { SearchInput } from '@/app/components/ui/SearchInput';
import { Badge } from '@/app/components/ui/Badge';
import { useI18n, useLayout } from '@/app/providers';
import { masterService } from '@/app/_services/master';
import type { MastItem } from '@/lib/types';
import { Button, Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableCaption, TableFooter, Card, CardContent, Label, Checkbox } from '@/components/ui';
import { items } from '@/lib/mock/data';
import { CreateItemModal } from '@/app/components/modal/CreateItemModal';

interface listItem {
    itemCode: string;
    itemName: string;
    brandName: string;
    minAlert: number;
    maxAlert: number;
    uomName: string;
    locationName: string;
    buyPrice: number;
    sellPrice: number;
    isLotno: boolean;
    isSerialNo: boolean;
}

export default function MasterItemPage() {

    const { t } = useI18n();
    // colums Table
    const columns = [
        { Name: t.master.item.itemCode, key: 'itemCode',  },
        { Name: t.master.item.itemName, key: 'itemName', types: 'text', },
        { Name: t.master.item.brand, key: 'brandName', types: 'text', },
        { Name: t.master.item.buyPrice, key: 'buyPrice', types: 'text' },
        { Name: t.master.item.sellPrice, key: 'sellPrice', types: 'text' },
        { Name: t.master.item.uom, key: 'uomName', types: 'text', },
        { Name: t.master.item.location, key: 'locationName', types: 'text', },
        { Name: t.master.item.minAlter, key: 'minAlert', types: 'text', },
        { Name: t.master.item.maxAlter, key: 'maxAlert', types: 'text', },
        { Name: t.master.item.isLotNo, key: 'isLotno', types: 'checkbox', width: '100px' },
        { Name: t.master.item.isSerialNo, key: 'isSerialNo', types: 'checkbox', width: '100px' },
        { Name: t.common.active, key: 'isActive', types: 'checkbox', width: '50px' },
    ];

    // State
    const [listItems, setListItems] = useState<MastItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { pageTitle } = useLayout(); // 2. ดึงตัวแปร pageTitle มาใช้งาน

    // Modal State
    const [editingItem, setEditingItem] = useState<MastItem | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
            if (res.success) {
                setListItems(res.results);

            }


        } catch (error) {
            console.error('Failed to fetch items:', error);
        } finally {
            setLoading(false);
        }
    }, [search]);

    // Debounce search
    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleOpenCreate = () => {
        setEditingItem(null);
        setIsCreateModalOpen(true);

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
        console.log(item);
        console.log(formData);

        setIsCreateModalOpen(true);
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
            fetchItems();
        } catch (error) {
            console.error('Save failed:', error);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    };


    const renderCellContent = (col: any, item: any) => {
        // ตรงนี้สามารถใช้ if, else if, else หรือ switch ได้ตามปกติเลยครับ
        if (!col.types || col.types === 'text') {
            return (item as any)[col.key] || '-';
        }
        else if (col.types === 'checkbox') {
            return <Checkbox checked={(item as any)[col.key] || false} />;
        }
        else if (col.types === 'number') {
            // ตัวอย่างการเพิ่มเงื่อนไขอื่นๆ
            return <span className="text-blue-500">{(item as any)[col.key]}</span>;
        }
        else {
            // กรณี Default
            return '-';
        }
    };

    return (
        <AppLayout>
            {/* Header Section */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{pageTitle}</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>จัดการข้อมูลรหัสสินค้าทั้งหมดในระบบ</p>
                </div>
                <div className="flex items-center gap-3">
                    <SearchInput value={search} onChange={setSearch} placeholder="ค้นหารหัส หรือ ชื่อสินค้า..." className="w-64" />
                    <Button
                        onClick={handleOpenCreate}
                        variant={'green'}
                        className="px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity"
                    >
                        + สร้างสินค้าใหม่
                    </Button>
                </div>
            </div>

            <Card className='flex  w-full'>
                <CardContent>
                    <Table className='w-full'>
                        {/* <TableCaption> A list of your recent invoices.</TableCaption> */}
                        <TableHeader>
                            <TableRow>
                                {columns.map(item => {
                                    return (
                                        <TableHead className='font-semibold' style={{ width: (item.width ?? 'auto') }} key={item.key}>
                                            <Label>{item.Name}</Label>
                                        </TableHead>
                                    );
                                })}
                                <TableHead key={'action'} className='w-[150px] text-right'>{t.common.actions}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!loading && listItems && listItems.length > 0 ?
                                (
                                    listItems.map((item, indexKey) => {
                                        return (
                                            <TableRow key={indexKey}>
                                                {columns.map(col => {
                                                    return (
                                                        <TableCell key={col.key}>
                                                            {renderCellContent(col, item)}
                                                        </TableCell>
                                                    )
                                                })}

                                                <TableCell key={'action'} className='text-right'>
                                                    <Button variant={'default'} onClick={() => handleOpenEdit(item)}>{t.common.edit}</Button>
                                                    <Button variant={'destructive'}>{t.common.delete}</Button>
                                                </TableCell>

                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length + 1} className='text-center'>
                                            {loading ? 'กำลังโหลดข้อมูล...' : 'ไม่มีข้อมูล'}
                                        </TableCell>
                                    </TableRow>
                                )
                            }
                        </TableBody>
                    </Table>

                </CardContent>
            </Card>

            {/* Create Item Modal (Shadcn Dialog) */}
            <CreateItemModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                onSaved={fetchItems}
                dataEdit={editingItem}
            />
        </AppLayout >
    );
}
