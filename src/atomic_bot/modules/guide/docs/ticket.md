## <:ticket:1411878131366891580> | Purchase Ticket Guide

Hai staff! ini panduan lengkap buat handle purchase ticket

---

### <:app:1381680319207575552> Alur Ticket

1. Customer buka ticket dari panel
2. Staff claim ticket
3. Bantu customer sampe selesai
4. Close ticket kalau udah beres

---

### <:OLOCK:1381580385892171816> Claim Ticket

Pas ada ticket baru, langsung **claim** biar customer tau ada yang handle

> Klik tombol **Claim** di thread ticket
> Nama kamu bakal muncul sebagai staff yang handle

---

### <:money:1381580383090380951> Submit Payment

Kalau customer udah bayar:

1. Minta bukti transfer dari customer
2. Ketik `/submit-payment` di thread
3. Isi semua field dengan benar
4. Tunggu admin approve

---

### Close Ticket

Ada 3 cara close ticket:

**1. Close Langsung**
> Klik tombol **Close** di thread

**2. Close dengan Reason**
> Klik tombol **Close with Reason**
> Isi alasan kenapa ticket di-close

**3. Close Request**
> Ketik `/close-request`
> Set deadline (contoh: 1h, 30m, 1d)
> Customer bisa Accept atau Deny

---

### Reopen Ticket

Kalau ticket perlu dibuka lagi:
> Klik tombol **Reopen This Ticket**
> Cuma staff yang bisa reopen

---

### Penting!

- Selalu claim ticket sebelum handle
- Jangan close ticket tanpa konfirmasi customer
- Kalau customer ga respon, pakai close request
- Submit payment **sebelum** close ticket

kiara:make_button("Contoh Close Request", "Customer ga respon 2 jam, mau kasih deadline 1 hari

```
/close-request
reason: Customer tidak merespon
deadline: 1d
```

Customer bakal dapet notif dan bisa pilih Accept atau Deny.");
