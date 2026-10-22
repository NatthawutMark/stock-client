
export const ServiceSystem = {
    formatThaiDate(dateStr?: string | Date | null): string {
        if (!dateStr) return "-";

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "-";

        return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).format(date); // ได้ผลลัพธ์เป็น 13/10/2569
    }
};