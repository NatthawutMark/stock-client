import React from 'react';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import StraightenOutlinedIcon from '@mui/icons-material/StraightenOutlined';
import MoveToInboxOutlinedIcon from '@mui/icons-material/MoveToInboxOutlined';
import OutboxOutlinedIcon from '@mui/icons-material/OutboxOutlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import LocationPinIcon from '@mui/icons-material/LocationPin';
import StorageIcon from '@mui/icons-material/Storage';

// ตารางจับคู่ชื่อ Icon string กับ React Component
export const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
    // Leaderboard
    LeaderboardIcon,
    Leaderboard: LeaderboardIcon,

    // Dashboard
    DashboardIcon,
    Dashboard: DashboardIcon,

    // Master
    StorageIcon: StorageIcon,

    // Items / Inventory
    InventoryIcon: Inventory2OutlinedIcon,
    Inventory: Inventory2OutlinedIcon,
    Inventory2Icon: Inventory2OutlinedIcon,
    Inventory2OutlinedIcon,

    // Warehouse
    WarehouseIcon: WarehouseOutlinedIcon,
    Warehouse: WarehouseOutlinedIcon,
    WarehouseOutlinedIcon,

    // Location
    LocationIcon: LocationOnOutlinedIcon,
    Location: LocationOnOutlinedIcon,
    LocationOnIcon: LocationOnOutlinedIcon,
    LocationOnOutlinedIcon,
    LocationPinIcon: LocationPinIcon,

    // Vendor / Shipping
    VendorIcon: LocalShippingOutlinedIcon,
    Vendor: LocalShippingOutlinedIcon,
    LocalShippingIcon: LocalShippingOutlinedIcon,
    LocalShippingOutlinedIcon,

    // Customer / People
    CustomerIcon: PeopleOutlinedIcon,
    Customer: PeopleOutlinedIcon,
    PeopleIcon: PeopleOutlinedIcon,
    PeopleOutlinedIcon,

    // DocType / Description
    DocTypeIcon: DescriptionOutlinedIcon,
    DocType: DescriptionOutlinedIcon,
    DescriptionIcon: DescriptionOutlinedIcon,
    DescriptionOutlinedIcon,

    // Brand / Category
    BrandIcon: CategoryOutlinedIcon,
    Brand: CategoryOutlinedIcon,
    CategoryIcon: CategoryOutlinedIcon,
    CategoryOutlinedIcon,

    // UOM / Unit
    UomIcon: StraightenOutlinedIcon,
    Uom: StraightenOutlinedIcon,
    StraightenIcon: StraightenOutlinedIcon,
    StraightenOutlinedIcon,

    // Transactions
    ReceiveIcon: MoveToInboxOutlinedIcon,
    Receive: MoveToInboxOutlinedIcon,
    MoveToInboxOutlinedIcon,

    IssueIcon: OutboxOutlinedIcon,
    Issue: OutboxOutlinedIcon,
    OutboxOutlinedIcon,

    ReturnIcon: AssignmentReturnOutlinedIcon,
    Return: AssignmentReturnOutlinedIcon,
    AssignmentReturnOutlinedIcon,

    DisposalIcon: DeleteOutlinedIcon,
    Disposal: DeleteOutlinedIcon,
    DeleteOutlinedIcon,

    TransferIcon: SwapHorizOutlinedIcon,
    Transfer: SwapHorizOutlinedIcon,
    SwapHorizOutlinedIcon,
};

/**
 * ฟังก์ชันช่วยแปลงชื่อ Icon จาก DB (เช่น "LeaderboardIcon" หรือ "<LeaderboardIcon />") เป็น React Element
 */
export function renderMenuIcon(
    iconString?: string | null,
    fallback: React.ReactNode = <LeaderboardIcon style={{ fontSize: '1.25rem' }} />
): React.ReactNode {
    if (!iconString) return fallback;

    // ตัดเครื่องหมาย <, >, / และช่องว่างออก เช่น "<LeaderboardIcon />" -> "LeaderboardIcon"
    const cleanName = iconString.replace(/[<>/]/g, '').trim();

    if (!cleanName) return fallback;

    // 1. ตรวจสอบจาก iconMap (ค้นหาแบบตรงตัว, เติม 'Icon', หรือแบบไม่สนตัวพิมพ์เล็ก-ใหญ่)
    const FoundComponent =
        iconMap[cleanName] ||
        iconMap[`${cleanName}Icon`] ||
        Object.entries(iconMap).find(([key]) => key.toLowerCase() === cleanName.toLowerCase())?.[1];

    if (FoundComponent) {
        return <FoundComponent style={{ fontSize: '1.25rem' }} />;
    }

    // 2. ถ้าใน DB เก็บเป็น Emoji (เช่น "📦", "📄", "🏷️")
    const isEmoji = cleanName.length <= 4 || /^\p{Extended_Pictographic}/u.test(cleanName);
    if (isEmoji) {
        return <span className="text-base leading-none">{cleanName}</span>;
    }

    // 3. กรณีไม่พบใน Map ให้แสดง fallback
    return fallback;
}

interface DynamicIconProps {
    name?: string | null;
    fallback?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export function DynamicIcon({
    name,
    fallback = <LeaderboardIcon style={{ fontSize: '1.25rem' }} />,
    className,
    style,
}: DynamicIconProps) {
    const iconElement = renderMenuIcon(name, fallback);
    return (
        <span className={`inline-flex items-center justify-center shrink-0 ${className || ''}`} style={style}>
            {iconElement}
        </span>
    );
}

export {
    LeaderboardIcon,
    DashboardIcon,
    Inventory2OutlinedIcon as InventoryIcon,
    WarehouseOutlinedIcon as WarehouseIcon,
    LocationOnOutlinedIcon as LocationIcon,
    LocalShippingOutlinedIcon as LocalShippingIcon,
    PeopleOutlinedIcon as PeopleIcon,
    DescriptionOutlinedIcon as DescriptionIcon,
    CategoryOutlinedIcon as CategoryIcon,
    StraightenOutlinedIcon as StraightenIcon,
};