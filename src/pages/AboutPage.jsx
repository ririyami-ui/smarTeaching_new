import React from 'react';

export default function AboutPage() {
  return (
    <div className="container mx-auto p-6 bg-surface-light dark:bg-surface-dark rounded-lg shadow-lg text-text-light dark:text-text-dark">
      <h1 className="text-3xl font-bold text-primary-dark dark:text-primary-light mb-6 text-center">Tentang Aplikasi</h1>

      <div className="flex flex-col items-center mb-8">
        <img
          src="/logo.png"
          alt="Smart Teaching Logo"
          className="w-32 h-32 mb-4"
        />
        <p className="text-lg font-semibold">Aplikasi Versi. 2.0.1</p>
      </div>

      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold text-text-light dark:text-text-dark mb-2">Pengembang</h2>
        <p className="text-md">Nama: Ririyami, S.Kom</p>
        <p className="text-md">Kabupaten/Kota: Bondowoso</p>
        <p className="text-md">Pekerjaan: Guru Informatika SMP Negeri 7 Bondowoso</p>
        <p className="text-md">CP: 082330108384</p>

      </div>

      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold text-text-light dark:text-text-dark mb-2">Deskripsi Aplikasi</h2>
        <p className="text-md">Aplikasi ini dibuat untuk memudahkan memanajemen kegiatan pembelajaran.</p>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-semibold text-text-light dark:text-text-dark mb-4">Dukungan & Bantuan</h2>
        <p className="text-md mb-4">Dukungan dan support anda untuk mempertahankan server bisa ke:</p>
        <img
          src="/Logo OVO Trans.png"
          alt="OVO Logo"
          className="w-24 h-auto mx-auto mb-2"
        />
        <p className="text-lg font-bold">OVO Nomor: 082330108384</p>
      </div>
    </div>
  );
}