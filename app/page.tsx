'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // เช็คค่าที่เก็บไว้ตอน login (เปลี่ยน 'user' หรือ 'token' ให้ตรงกับ key ที่คุณใช้เก็บจริง)
    const token = localStorage.getItem('token') || localStorage.getItem('user');

    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p>กำลังตรวจสอบสิทธิ์...</p>
    </div>
  );
}