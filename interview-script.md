# Script Penjelasan: Alur Pemrosesan AI

Bagian yang paling penting untuk dijelaskan adalah **alur pemrosesan AI** (`server/services/ai.service.ts`). Ini inti dari tes (AI-augmented) dan menunjukkan paling banyak pertimbangan teknis dalam kode yang paling sedikit.

Durasi: sekitar 3 menit.

---

## 1. Brief disimpan dulu

**Buka:** `server/api/briefs/index.post.ts:20-26`

> "Saat klien mengirim form, brief langsung saya simpan dan saya balas 201 saat itu juga. AI tidak dijalankan di dalam request. Jadi kalau DeepSeek lambat atau mati, klien tetap dapat respons sukses dan brief tidak pernah hilang."

## 2. Tabel `briefs` sebagai antrean

**Buka:** `server/services/ai.service.ts:21-40` (`claimPendingBriefs`)

> "Antreannya adalah tabel `briefs` itu sendiri. Kolom `ai_status` menyimpan status job-nya, jadi saya tidak perlu Redis atau BullMQ. Worker di background mengambil brief yang masih pending dengan satu query `UPDATE … FOR UPDATE SKIP LOCKED`. `SKIP LOCKED` artinya kalau ada dua worker berjalan bersamaan, masing-masing melewati baris yang sedang dikunci worker lain. Jadi satu brief tidak akan pernah diproses dua kali, bahkan kalau server-nya lebih dari satu."

## 3. Pemulihan job yang macet

**Tunjuk:** `ai.service.ts:43-51` (`recoverStuckBriefs`)

> "Kalau server crash di tengah proses, baris itu akan tertahan di status `processing` selamanya. Karena itu, brief yang macet lebih dari 2 menit dikembalikan ke `pending` dan diproses ulang."

## 4. Pemrosesan yang tidak pernah throw

**Buka:** `ai.service.ts:58-118` (`processBrief`)

> "Fungsi ini tidak pernah throw. Setiap jalur pasti berakhir `completed` atau `failed`.
> Fungsi ini memanggil DeepSeek dalam mode JSON dengan timeout 20 detik, dan hanya mencoba ulang sekali untuk error sementara seperti gangguan jaringan, 429, atau 5xx.
> Lalu output-nya saya parse dengan schema Zod yang ketat."

## 5. Schema yang ketat

**Buka sebentar:** `shared/schemas/ai-result.ts:9-15`

> "Ini bentuk persis yang wajib dikembalikan AI. Schema-nya strict: ada key tambahan, priority seperti 'Urgent' yang tidak ada di enum, atau summary kosong, semuanya gagal. **Tidak ada output yang belum tervalidasi yang disimpan sebagai hasil.**"

## 6. Menyimpan hasil atau error

**Kembali ke:** `ai.service.ts:91-110`

> "Kalau berhasil, dalam satu transaksi hasilnya disimpan, kategori dan prioritas disalin ke kolom sendiri yang ber-index supaya filter di daftar cepat, dan percobaannya dicatat di `ai_runs`.
> Kalau gagal, `markFailed` menyimpan pesan error *beserta output mentah dari AI*, jadi saya bisa melihat persis apa yang dijawab model. Di dashboard, admin melihat error-nya dan tombol 'Proses ulang AI'."

## Kalimat penutup

> "Jadi AI saya perlakukan sebagai layanan luar yang tidak bisa diandalkan: brief disimpan dulu, pekerjaan masuk antrean dengan aman, setiap output divalidasi, dan setiap kegagalan terlihat serta bisa diproses ulang."

---

## Kalau ditanya

**"Kenapa tidak pakai queue sungguhan?"**
Satu layanan lebih sedikit yang perlu di-deploy, status job tetap ada setelah restart, dan sudah cukup untuk tool internal. Trade-off-nya: worker melakukan polling, tidak ada jadwal backoff per job, dan worker berjalan di dalam proses web.

## Demo langsung

Set `AI_FORCE_FAIL=true` untuk menunjukkan kartu gagal dan tombol "Proses ulang AI" yang berfungsi.
