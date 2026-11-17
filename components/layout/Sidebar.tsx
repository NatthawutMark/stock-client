'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n, useLayout } from '@/app/providers';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui';
import { LeaderboardIcon, renderMenuIcon } from '@/components/icon/index';

interface NavMenu {
    url?: string;
    nameTh: string;
    nameEn?: string;
    icon?: string;
    subMenus?: NavMenu[];
    orderNo?: number;
}

interface SidebarProps {
    mobileOpen?: boolean;
    onMobileClose?: () => void;
}

interface SidebarNavProps {
    listMenu: NavMenu[];
    lang: string;
    pathname: string;
    collapsed: boolean;
    openGroups: Record<string, boolean>;
    onToggleGroup: (key: string) => void;
    onNavigate?: () => void;
}

function SidebarNav({
    listMenu,
    lang,
    pathname,
    collapsed,
    openGroups,
    onToggleGroup,
    onNavigate,
}: SidebarNavProps) {
    return (
        <nav className="flex-1 overflow-y-auto overscroll-contain py-2">
            {listMenu.map((item) => {
                const menuLang = (lang === 'th' ? item.nameTh : item.nameEn) || '';

                if (item.subMenus && item.subMenus.length > 0) {
                    const isOpen = openGroups[menuLang] ?? false;
                    const hasUrl = Boolean(item.url && item.url !== '#');
                    const isParentActive = hasUrl && pathname === item.url;
                    const anyActive =
                        isParentActive ||
                        item.subMenus.some((c) => c.url && pathname.startsWith(c.url));

                    return (
                        <Collapsible
                            key={menuLang}
                            open={isOpen}
                            onOpenChange={() => onToggleGroup(menuLang)}
                            className="mb-2"
                        >
                            {hasUrl ? (
                                <div
                                    className={`flex items-center justify-between mx-2 mb-0.5 rounded-lg transition-colors group ${
                                        isParentActive
                                            ? 'bg-blue-600 text-white'
                                            : anyActive
                                                ? 'text-blue-400 bg-white/5'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <Link
                                        href={item.url!}
                                        onClick={() => {
                                            if (!isOpen) onToggleGroup(menuLang);
                                            onNavigate?.();
                                        }}
                                        className="flex items-center gap-3 flex-1 min-w-0 px-3 py-2.5 text-sm font-medium transition-colors"
                                        title={collapsed ? menuLang : undefined}
                                    >
                                        <span className="text-sm flex items-center justify-center shrink-0">
                                            {renderMenuIcon(
                                                item.icon,
                                                <LeaderboardIcon style={{ fontSize: '1.25rem' }} />
                                            )}
                                        </span>
                                        {!collapsed && <span className="truncate">{menuLang}</span>}
                                    </Link>

                                    {!collapsed && (
                                        <CollapsibleTrigger
                                            className="p-2 mr-1 rounded-md hover:bg-white/10 text-slate-400 group-hover:text-white transition-colors shrink-0"
                                            title={isOpen ? 'พับเก็บเมนูย่อย' : 'กางเมนูย่อย'}
                                        >
                                            {isOpen ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </CollapsibleTrigger>
                                    )}
                                </div>
                            ) : (
                                <CollapsibleTrigger
                                    className={`w-[calc(100%-1rem)] flex items-center justify-between px-3 py-2.5 mx-2 mb-0.5 rounded-lg transition-colors group cursor-pointer ${
                                        anyActive
                                            ? 'text-blue-400 bg-white/5'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0 text-sm font-medium">
                                        <span className="text-sm flex items-center justify-center shrink-0">
                                            {renderMenuIcon(
                                                item.icon,
                                                <LeaderboardIcon style={{ fontSize: '1.25rem' }} />
                                            )}
                                        </span>
                                        {!collapsed && <span className="truncate">{menuLang}</span>}
                                    </div>

                                    {!collapsed && (
                                        <div className="shrink-0 text-slate-400 group-hover:text-white transition-transform duration-200 mr-1">
                                            {isOpen ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </div>
                                    )}
                                </CollapsibleTrigger>
                            )}

                            <CollapsibleContent className="pl-4 pt-1 space-y-0.5 overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                                {!collapsed &&
                                    item.subMenus.map((child) => {
                                        const active = child.url ? pathname === child.url : false;
                                        const childLang = (lang === 'th' ? child.nameTh : child.nameEn) || '';

                                        return (
                                            <Link
                                                key={child.url || childLang}
                                                href={child.url || '#'}
                                                onClick={() => onNavigate?.()}
                                                className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg mx-2 mb-0.5 transition-colors ${
                                                    active
                                                        ? 'bg-blue-600 text-white'
                                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                <span className="text-sm flex items-center justify-center shrink-0">
                                                    {renderMenuIcon(
                                                        child.icon,
                                                        <LeaderboardIcon style={{ fontSize: '1.25rem' }} />
                                                    )}
                                                </span>
                                                <span className="truncate">{childLang}</span>
                                            </Link>
                                        );
                                    })}
                            </CollapsibleContent>
                        </Collapsible>
                    );
                }

                const active = item.url ? pathname === item.url : false;
                return (
                    <Link
                        key={item.url || menuLang}
                        href={item.url || '#'}
                        onClick={() => onNavigate?.()}
                        className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors text-sm mb-1 ${
                            active
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                        title={collapsed ? menuLang : undefined}
                    >
                        <span className="text-base shrink-0 flex items-center justify-center">
                            {renderMenuIcon(item.icon, '📄')}
                        </span>
                        {!collapsed && <span className="font-medium truncate">{menuLang}</span>}
                    </Link>
                );
            })}
        </nav>
    );
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
    const { lang } = useI18n();
    const { setPageTitle } = useLayout();
    const pathname = usePathname();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [listMenu, setListMenu] = useState<NavMenu[]>([]);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const [collapsed, setCollapsed] = useState(false);

    const toggle = (key: string) =>
        setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

    // ซิงค์สถานะ Drawer บนมือถือกับ Native <dialog> (top layer + focus trap + Esc)
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (mobileOpen) {
            if (!dialog.open) dialog.showModal();
        } else if (dialog.open) {
            dialog.close();
        }
    }, [mobileOpen]);

    useEffect(() => {
        try {
            const getMenuLocal = localStorage.getItem('wms-user');
            if (getMenuLocal) {
                const userMenu = JSON.parse(getMenuLocal)?.menus;
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setListMenu(userMenu || []);
            }
        } catch (error) {
            console.error('Failed to parse user menu', error);
        }
    }, [lang]);

    useEffect(() => {
        if (listMenu.length === 0) return;
        let currentActiveTitle = '';
        const newGroupsToOpen: Record<string, boolean> = {};

        listMenu.forEach((item) => {
            if (item.subMenus && item.subMenus.length > 0) {
                const menuKey = (lang === 'th' ? item.nameTh : item.nameEn) || '';

                if (item.url && pathname === item.url) {
                    currentActiveTitle = menuKey;
                    if (menuKey) newGroupsToOpen[menuKey] = true;
                }

                item.subMenus.forEach((child) => {
                    if (child.url && pathname.startsWith(child.url)) {
                        currentActiveTitle = (lang === 'th' ? child.nameTh : child.nameEn) || '';
                        if (menuKey) newGroupsToOpen[menuKey] = true;
                    }
                });
            } else if (item.url && pathname.startsWith(item.url)) {
                currentActiveTitle = (lang === 'th' ? item.nameTh : item.nameEn) || '';
            }
        });

        if (Object.keys(newGroupsToOpen).length > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setOpenGroups((prev) => ({ ...prev, ...newGroupsToOpen }));
        }

        if (currentActiveTitle) {
            setPageTitle(currentActiveTitle);
        }
    }, [pathname, listMenu, lang, setPageTitle]);

    return (
        <>
            {/* Desktop Sidebar (>= lg / 1024px) */}
            <aside
                className="hidden lg:flex flex-col transition-all duration-300 h-full shrink-0"
                style={{
                    width: collapsed ? 64 : 240,
                    background: 'var(--bg-sidebar)',
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                }}
            >
                <div className="flex items-center gap-3 px-4 py-5 shrink-0">
                    <span className="text-2xl">📦</span>
                    {!collapsed && (
                        <span className="text-white font-bold text-sm leading-tight">
                            WMS
                            <br />
                            <span className="text-blue-400 font-normal text-xs">Warehouse Mgmt</span>
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => setCollapsed((c) => !c)}
                        className="ml-auto text-slate-400 hover:text-white transition-colors text-lg cursor-pointer px-1.5"
                        aria-label="Toggle sidebar"
                    >
                        {collapsed ? '›' : '‹'}
                    </button>
                </div>

                <SidebarNav
                    listMenu={listMenu}
                    lang={lang}
                    pathname={pathname}
                    collapsed={collapsed}
                    openGroups={openGroups}
                    onToggleGroup={toggle}
                />
            </aside>

            {/* Mobile & Tablet Navigation Drawer (< lg / 1024px) */}
            <dialog
                ref={dialogRef}
                id="mobile-sidebar-drawer"
                aria-label={lang === 'th' ? 'เมนูนำทางหลัก' : 'Main navigation'}
                onClose={() => onMobileClose?.()}
                onClick={(e) => {
                    if (e.target === dialogRef.current) {
                        onMobileClose?.();
                    }
                }}
                className="lg:hidden fixed inset-y-0 left-0 right-auto m-0 h-svh max-h-none w-[min(20em,80dvw,calc(100dvw-24px))] max-w-none p-0 border-r border-white/10 text-slate-200 shadow-2xl overscroll-contain backdrop:bg-black/50 backdrop:backdrop-blur-[2px] open:animate-in open:fade-in-0 open:slide-in-from-left-4 duration-200"
                style={{ background: 'var(--bg-sidebar)' }}
            >
                <div className="flex flex-col h-full w-full pb-[env(safe-area-inset-bottom)]">
                    <div className="flex items-center gap-3 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-white/10 shrink-0">
                        <span className="text-2xl">📦</span>
                        <span className="text-white font-bold text-sm leading-tight">
                            WMS
                            <br />
                            <span className="text-blue-400 font-normal text-xs">Warehouse Mgmt</span>
                        </span>
                        <button
                            type="button"
                            onClick={() => onMobileClose?.()}
                            className="ml-auto inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            aria-label={lang === 'th' ? 'ปิดเมนู' : 'Close menu'}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <SidebarNav
                        listMenu={listMenu}
                        lang={lang}
                        pathname={pathname}
                        collapsed={false}
                        openGroups={openGroups}
                        onToggleGroup={toggle}
                        onNavigate={onMobileClose}
                    />
                </div>
            </dialog>
        </>
    );
}
