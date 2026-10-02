'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n, useLayout } from '@/app/providers';
import Swal from 'sweetalert2';
import { ReactJsxRuntime } from 'next/dist/server/route-modules/app-page/vendored/rsc/entrypoints';
import { Label, Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface NavItem {
    href?: string;
    labelKey: string;
    icon: string;
    children?: NavItem[];
    orderNo?: number;
}

interface NavMenu {
    url?: string;
    nameTh: string;
    nameEn?: string;
    icon?: string;
    subMenus?: NavMenu[];
    orderNo?: number;
}

// const NAV: NavItem[] = [
//     { href: '/dashboard', labelKey: 'dashboard', icon: '⊞' },
//     {
//         labelKey: 'master', icon: '☰',
//         children: [
//             { href: '/master/items', labelKey: 'items', icon: '📦' },
//             { href: '/master/brands', labelKey: 'brands', icon: '🏷️' },
//             { href: '/master/warehouses', labelKey: 'warehouses', icon: '🏭' },
//             { href: '/master/locations', labelKey: 'locations', icon: '📍' },
//             { href: '/master/vendors', labelKey: 'vendors', icon: '🚚' },
//             { href: '/master/customers', labelKey: 'customers', icon: '👤' },
//         ],
//     },
//     {
//         labelKey: 'transactions', icon: '📄',
//         children: [
//             { href: '/transactions/receive', labelKey: 'receive', icon: '📥' },
//             { href: '/transactions/issue', labelKey: 'issue', icon: '📤' },
//             { href: '/transactions/request', labelKey: 'request', icon: '📋' },
//             { href: '/transactions/transfer', labelKey: 'transfer', icon: '🔀' },
//             { href: '/transactions/disposal', labelKey: 'disposal', icon: '🗑️' },
//         ],
//     },
//     { href: '/inventory', labelKey: 'inventory', icon: '🗃️' },
// ];


function getLabel(key: string, t: ReturnType<typeof useI18n>['t']) {
    return (t.nav as Record<string, string>)[key] ?? key;
}

export function Sidebar() {
    const { t, lang } = useI18n();
    const { setPageTitle } = useLayout();
    const pathname = usePathname();
    const [listMenu, setListMenu] = useState<NavMenu[]>([])
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const [collapsed, setCollapsed] = useState(false);

    const toggle = (key: string) =>
        setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));

    useEffect(() => {
        try {
            const getMenuLocal = localStorage.getItem('wms-user');
            if (getMenuLocal) {
                const userMenu = JSON.parse(getMenuLocal)?.menus;
                setListMenu(userMenu || []);
            }
        } catch (error) {
            console.error("Failed to parse user menu", error);
        }
    }, [lang]);

    useEffect(() => {
        if (listMenu.length === 0) return;
        // setOpenGroups(prev => {
        //     const newGroups = { ...prev };
        //     listMenu.forEach(item => {
        //         if (item.subMenus && item.subMenus.length > 0) {
        //             const menuKey = (lang === 'th' ? item.nameTh : item.nameEn) || '';

        //             // ตรวจสอบว่า URL ตอนนี้ตรงกับเมนูย่อยอันไหนหรือไม่
        //             const isCurrentActive = item.subMenus.some(
        //                 c => c.url && pathname.startsWith(c.url)
        //             );

        //             // ถ้ากำลังเปิดหน้าเมนูย่อยนั้นอยู่ ให้บังคับกางออก
        //             if (isCurrentActive && menuKey) {
        //                 newGroups[menuKey] = true;
        //             }
        //         }
        //     });
        //     console.log('newGroup', newGroups)
        //     return newGroups;
        // });
        // console.log('openGroups', openGroups);
        let currentActiveTitle = ''; // ตัวแปรเก็บชื่อหน้าที่กำลังใช้งาน
        const newGroupsToOpen: Record<string, boolean> = {};

        listMenu.forEach(item => {
            if (item.subMenus && item.subMenus.length > 0) {
                const menuKey = (lang === 'th' ? item.nameTh : item.nameEn) || '';

                // ตรวจสอบว่ามีเมนูย่อยไหนตรงกับ URL ไหม
                item.subMenus.forEach(child => {
                    if (child.url && pathname.startsWith(child.url)) {
                        // ถ้าตรง ให้จำชื่อเมนูย่อยไว้
                        currentActiveTitle = (lang === 'th' ? child.nameTh : child.nameEn) || '';
                        // และสั่งให้กลุ่มหลักนี้กางออก
                        if (menuKey) newGroupsToOpen[menuKey] = true;
                    }
                });
            } else {
                // กรณีเป็นเมนูเดี่ยว (ไม่มีลูก)
                if (item.url && pathname.startsWith(item.url)) {
                    currentActiveTitle = (lang === 'th' ? item.nameTh : item.nameEn) || '';
                }
            }
        });

        // 1. สั่งกางเมนูกลุ่มที่มีการอัปเดต (ผสมกับของเดิม)
        if (Object.keys(newGroupsToOpen).length > 0) {
            setOpenGroups(prev => ({ ...prev, ...newGroupsToOpen }));
        }

        // 2. สั่งเซ็ตชื่อหน้าเว็บไปที่ Provider 
        // (ทำแยกออกมาด้านนอกสุด ไม่ไปปนใน setOpenGroups)
        if (currentActiveTitle) {
            setPageTitle(currentActiveTitle);
        }

    }, [pathname, listMenu, lang,]);

    // return (
    //     <aside
    //         className="flex flex-col transition-all duration-300 h-full shrink-0"
    //         style={{
    //             width: collapsed ? 64 : 240,
    //             background: 'var(--bg-sidebar)',
    //             borderRight: '1px solid rgba(255,255,255,0.05)',
    //         }}
    //     >
    //         {/* Logo */}
    //         <div className="flex items-center gap-3 px-4 py-5 shrink-0">
    //             <span className="text-2xl">📦</span>
    //             {!collapsed && (
    //                 <span className="text-white font-bold text-sm leading-tight">
    //                     WMS<br />
    //                     <span className="text-blue-400 font-normal text-xs">Warehouse Mgmt</span>
    //                 </span>
    //             )}
    //             <button
    //                 onClick={() => setCollapsed(c => !c)}
    //                 className="ml-auto text-slate-400 hover:text-white transition-colors text-lg"
    //                 aria-label="Toggle sidebar"
    //             >
    //                 {collapsed ? '›' : '‹'}
    //             </button>
    //         </div>

    //         {/* Nav items */}
    //         <nav className="flex-1 overflow-y-auto py-2">
    //             {listMenu.map(item => {
    //                 const menuLang = (lang == 'th' ? item.nameTh : item.nameEn) || ''
    //                 if (item.subMenus) {
    //                     // const isOpen = openGroups['false'] ?? false;
    //                     const isOpen = openGroups[menuLang] ?? false;
    //                     const anyActive = item.subMenus.some(c => c.url && pathname.startsWith(c.url));
    //                     return (
    //                         <div key={menuLang}>
    //                             <button
    //                                 onClick={() => toggle(menuLang)}
    //                                 className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
    //                 ${anyActive ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
    //                                 style={{ background: anyActive ? 'rgba(59,130,246,0.1)' : undefined }}
    //                             >
    //                                 <span className="text-base shrink-0">{item.icon}</span>
    //                                 {!collapsed && (
    //                                     <>
    //                                         <span className="flex-1 text-left font-medium">
    //                                             {getLabel(menuLang, t)}
    //                                         </span>
    //                                         <span className="text-xs">{isOpen ? '▾' : '▸'}</span>
    //                                     </>
    //                                 )}
    //                             </button>
    //                             {!collapsed && isOpen && (
    //                                 <div className="pl-4">
    //                                     {item.subMenus.map(child => {
    //                                         const active = child.url ? pathname === child.url : false;
    //                                         return (
    //                                             <Link
    //                                                 key={child.url}
    //                                                 href={child.url!}
    //                                                 className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg mx-2 mb-0.5 transition-colors
    //                         ${active
    //                                                         ? 'bg-blue-600 text-white'
    //                                                         : 'text-slate-400 hover:text-white hover:bg-white/5'
    //                                                     }`}
    //                                             >
    //                                                 <span className="text-sm">{child.icon}</span>
    //                                                 <span>{menuLang}</span>
    //                                             </Link>
    //                                         );
    //                                     })}
    //                                 </div>
    //                             )}
    //                         </div>
    //                     );
    //                 }

    //                 const active = item.url ? pathname === item.url : false;
    //                 return (
    //                     <Link
    //                         key={item.url}
    //                         href={item.url!}
    //                         className={`flex items-center gap-3 px-4 py-2.5 mx-2 mb-0.5 rounded-lg text-sm transition-colors
    //             ${active
    //                                 ? 'bg-blue-600 text-white'
    //                                 : 'text-slate-400 hover:text-white hover:bg-white/5'
    //                             }`}
    //                     >
    //                         <span className="text-base shrink-0">{item.icon}</span>
    //                         {!collapsed && (
    //                             <span className="font-medium">{menuLang}</span>
    //                         )}
    //                     </Link>
    //                 );
    //             })}
    //         </nav>
    //     </aside>
    // );
    // return (
    //     <aside
    //         className="flex flex-col transition-all duration-300 h-full shrink-0"
    //         style={{
    //             width: collapsed ? 64 : 240,
    //             background: 'var(--bg-sidebar)',
    //             borderRight: '1px solid rgba(255,255,255,0.05)',
    //         }}
    //     >
    //         {/* Logo */}
    //         <div className="flex items-center gap-3 px-4 py-5 shrink-0">
    //             <span className="text-2xl">📦</span>
    //             {!collapsed && (
    //                 <span className="text-white font-bold text-sm leading-tight">
    //                     WMS<br />
    //                     <span className="text-blue-400 font-normal text-xs">Warehouse Mgmt</span>
    //                 </span>
    //             )}
    //             <button
    //                 onClick={() => setCollapsed(c => !c)}
    //                 className="ml-auto text-slate-400 hover:text-white transition-colors text-lg"
    //                 aria-label="Toggle sidebar"
    //             >
    //                 {collapsed ? '›' : '‹'}
    //             </button>
    //         </div>

    //         {/* Nav items */}
    //         <nav className="flex-1 overflow-y-auto py-2">
    //             {listMenu.map(item => {
    //                 const menuLang = (lang === 'th' ? item.nameTh : item.nameEn) || '';

    //                 if (item.subMenus && item.subMenus.length > 0) {
    //                     const isOpen = openGroups[menuLang] ?? false;
    //                     const anyActive = item.subMenus.some(c => c.url && pathname.startsWith(c.url));

    //                     return (
    //                         <div key={menuLang}>
    //                             <Label className='text-sidebar m-3' style={{ color: 'var(--text-sidebar)' }}>{menuLang}</Label>

    //                             <div className="pl-4">
    //                                 {item.subMenus.map(child => {
    //                                     const active = child.url ? pathname === child.url : false;
    //                                     const childLang = (lang === 'th' ? child.nameTh : child.nameEn) || '';

    //                                     return (
    //                                         <Link
    //                                             key={child.url}
    //                                             href={child.url || '#'}
    //                                             className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg mx-2 mb-0.5 transition-colors
    //                                                     ${active
    //                                                     ? 'bg-blue-600 text-white'
    //                                                     : 'text-slate-400 hover:text-white hover:bg-white/5'
    //                                                 }`}
    //                                         >
    //                                             <span className="text-sm">{child.icon || '📄'}</span>
    //                                             {/* แก้ไขให้ดึงชื่อของเมนูย่อยมาแสดง ไม่ใช่ดึงเมนูหลัก */}
    //                                             <span>{childLang}</span>
    //                                         </Link>
    //                                     );
    //                                 })}
    //                             </div>
    //                         </div>
    //                     );
    //                 }

    //                 // กรณีเมนูไม่มีลูก (เมนูเดี่ยว)
    //                 const active = item.url ? pathname === item.url : false;
    //                 return (
    //                     <Link
    //                         key={item.url || menuLang}
    //                         href={item.url || '#'}
    //                         className={`flex items-center gap-3 px-4 py-2.5 mx-2 mb-0.5 rounded-lg text-sm transition-colors
    //                             ${active
    //                                 ? 'bg-blue-600 text-white'
    //                                 : 'text-slate-400 hover:text-white hover:bg-white/5'
    //                             }`}
    //                     >
    //                         <span className="text-base shrink-0">{item.icon || '📄'}</span>
    //                         {!collapsed && (
    //                             <span className="font-medium">{menuLang}</span>
    //                         )}
    //                     </Link>
    //                 );
    //             })}
    //         </nav>
    //     </aside>
    // );
    return (
        <aside
            className="flex flex-col transition-all duration-300 h-full shrink-0"
            style={{
                width: collapsed ? 64 : 240,
                background: 'var(--bg-sidebar)',
                borderRight: '1px solid rgba(255,255,255,0.05)',
            }}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 py-5 shrink-0">
                <span className="text-2xl">📦</span>
                {!collapsed && (
                    <span className="text-white font-bold text-sm leading-tight">
                        WMS<br />
                        <span className="text-blue-400 font-normal text-xs">Warehouse Mgmt</span>
                    </span>
                )}
                <button
                    onClick={() => setCollapsed(c => !c)}
                    className="ml-auto text-slate-400 hover:text-white transition-colors text-lg"
                    aria-label="Toggle sidebar"
                >
                    {collapsed ? '›' : '‹'}
                </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto py-2">
                {listMenu.map(item => {
                    const menuLang = (lang === 'th' ? item.nameTh : item.nameEn) || '';

                    if (item.subMenus && item.subMenus.length > 0) {
                        const isOpen = openGroups[menuLang] ?? false;
                        const anyActive = item.subMenus.some(c => c.url && pathname.startsWith(c.url));

                        return (
                            <Collapsible
                                key={menuLang}
                                open={isOpen}
                                onOpenChange={() => toggle(menuLang)}
                                className="mb-2"
                            >
                                {/* เปลี่ยน Label ให้เป็น Trigger ที่กดได้ */}
                                <CollapsibleTrigger className="w-full flex items-center justify-between cursor-pointer px-4 py-2 hover:bg-white/5 transition-colors group" >
                                    <Label
                                        className="text-sidebar m-0 font-medium cursor-pointer"
                                        style={{ color: anyActive ? '#60a5fa' : 'var(--text-sidebar)' }}
                                    >
                                        {menuLang}
                                    </Label>

                                    {/* ไอคอนลูกศรเปลี่ยนทิศทางตามสถานะการเปิด/ปิด */}
                                    {!collapsed && (
                                        <div className="shrink-0 text-slate-400 group-hover:text-white transition-transform duration-200">
                                            {isOpen ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </div>
                                    )}
                                </CollapsibleTrigger>

                                {/* ส่วนเมนูย่อยที่จะพับ/กาง */}
                                <CollapsibleContent className="pl-4 pt-1 space-y-0.5 overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                                    {!collapsed && item.subMenus.map(child => {
                                        const active = child.url ? pathname === child.url : false;
                                        const childLang = (lang === 'th' ? child.nameTh : child.nameEn) || '';

                                        return (
                                            <Link
                                                key={child.url || childLang} // ใช้ childLang เป็น key สำรองกรณีไม่มี url
                                                href={child.url || '#'}
                                                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg mx-2 mb-0.5 transition-colors
                                                        ${active
                                                        ? 'bg-blue-600 text-white'
                                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                <span className="text-sm">{child.icon || '📄'}</span>
                                                <span>{childLang}</span>
                                            </Link>
                                        );
                                    })}
                                </CollapsibleContent>
                            </Collapsible>
                        );
                    }

                    // กรณีเมนูไม่มีลูก (เมนูเดี่ยว)
                    const active = item.url ? pathname === item.url : false;
                    return (
                        <Link
                            key={item.url || menuLang}
                            href={item.url || '#'}
                            className={`flex items-center gap-3 px-4 py-2.5 mx-2 mb-0.5 rounded-lg text-sm transition-colors
                                ${active
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <span className="text-base shrink-0">{item.icon || '📄'}</span>
                            {!collapsed && (
                                <span className="font-medium">{menuLang}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}

