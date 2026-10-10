'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/app/components/layout/AppLayout';
import { SearchInput } from '@/app/components/ui/SearchInput';
import { useI18n, useLayout } from '@/app/providers';
import { transactionService } from '@/app/_services/transaction';
import type { DocReceive, DocIssue } from '@/lib/types';
import { Button, Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Card, CardContent, Label } from '@/components/ui';

export default function DocumentsPage() {
    const { t } = useI18n();
    const { pageTitle } = useLayout();
    const [activeTab, setActiveTab] = useState<'receive' | 'issue' | 'return'>('receive');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const [receiveList, setReceiveList] = useState<DocReceive[]>([]);
    const [issueList, setIssueList] = useState<DocIssue[]>([]);

    // For return we might mock for now since it's not in the service
    const [returnList, setReturnList] = useState<Record<string, unknown>[]>([]);

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'receive') {
                const res = await transactionService.receive.list({ search });
                if (res.success) {
                    setReceiveList(res.results || []);
                }
            } else if (activeTab === 'issue') {
                const res = await transactionService.issue.list({ search });
                if (res.success) {
                    setIssueList(res.results || []);
                }
            } else if (activeTab === 'return') {
                // Mock or handle return documents
                setReturnList([]);
            }
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        } finally {
            setLoading(false);
        }
    }, [search, activeTab]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchDocuments();
    }, [fetchDocuments]);

    const getColumns = () => {
        if (activeTab === 'receive') {
            return [
                { Name: 'เลขที่เอกสาร', key: 'docNo' },
                { Name: 'วันที่สร้าง', key: 'createDate' },
                { Name: 'ผู้สร้าง', key: 'createBy' },
                { Name: 'รหัสคลัง', key: 'warehouseId' },
                { Name: 'หมายเหตุ', key: 'remark' },
            ];
        } else if (activeTab === 'issue') {
            return [
                { Name: 'เลขที่เอกสาร', key: 'docNo' },
                { Name: 'วันที่สร้าง', key: 'createDate' },
                { Name: 'ผู้สร้าง', key: 'createBy' },
                { Name: 'รหัสลูกค้า', key: 'customerId' },
                { Name: 'หมายเหตุ', key: 'remark' },
            ];
        } else {
            return [
                { Name: 'เลขที่เอกสาร', key: 'docNo' },
                { Name: 'วันที่สร้าง', key: 'createDate' },
                { Name: 'ผู้สร้าง', key: 'createBy' },
                { Name: 'เหตุผล', key: 'reasonId' },
            ];
        }
    };

    const columns = getColumns();
    const data = activeTab === 'receive' ? receiveList : activeTab === 'issue' ? issueList : returnList;

    return (
        <AppLayout>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{pageTitle || 'รายการเอกสาร'}</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>จัดการข้อมูลเอกสารทั้งหมดในระบบ (รับ, จ่าย, คืน)</p>
                </div>
                <div className="flex items-center gap-3">
                    <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาเอกสาร..." className="w-64" />
                    <Button
                        variant={'green'}
                        className="px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity"
                    >
                        + สร้างเอกสารใหม่
                    </Button>
                </div>
            </div>

            <div className="flex gap-4 mb-4">
                <Button
                    variant={activeTab === 'receive' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('receive')}
                >
                    รับ (Receive)
                </Button>
                <Button
                    variant={activeTab === 'issue' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('issue')}
                >
                    จ่าย (Issue)
                </Button>
                <Button
                    variant={activeTab === 'return' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('return')}
                >
                    คืน (Return)
                </Button>
            </div>

            <Card className='flex w-full'>
                <CardContent className="w-full pt-6">
                    <Table className='w-full'>
                        <TableHeader>
                            <TableRow>
                                {columns.map(item => (
                                    <TableHead className='font-semibold' key={item.key}>
                                        <Label>{item.Name}</Label>
                                    </TableHead>
                                ))}
                                <TableHead className='w-[150px] text-right'>{t.common.actions}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!loading && data && data.length > 0 ? (
                                data.map((item, indexKey: number) => {
                                    const record = item as Record<string, unknown>;
                                    return (
                                        <TableRow key={indexKey}>
                                            {columns.map(col => (
                                                <TableCell key={col.key}>
                                                    {String(record[col.key] || '-')}
                                                </TableCell>
                                            ))}
                                            <TableCell className='text-right'>
                                                <Button variant={'default'} className="mr-2">{t.common.edit}</Button>
                                                <Button variant={'destructive'}>{t.common.delete}</Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length + 1} className='text-center'>
                                        {loading ? 'กำลังโหลดข้อมูล...' : 'ไม่มีข้อมูล'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </AppLayout>
    );
}
