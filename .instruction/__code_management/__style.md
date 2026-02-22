## PERATURAN STYLING CODING 1. GENERAL

* Aturan ini **WAJIB** diikuti di seluruh codebase
* Tidak ada gaya pribadi di luar aturan ini
* Jika ragu, **ikuti struktur project yang sudah ada**
* Utamakan:

  * readability
  * maintainability
  * scalability
  * performance

---

## PERATURAN STYLING CODING 2. NAMING CONVENTION

* Gunakan **snake_case**
* Wajib bahasa Inggris
* Berlaku untuk:

  * variable
  * function
  * class
  * file
  * folder
* Hindari:

  * singkatan tidak jelas
  * nama ambigu
  * campur bahasa

Contoh:

```ts
user_id
reminder_controller
create_reminder
```

---

## PERATURAN STYLING CODING 3. CONSTANT

* Constant **WAJIB lowercase**
* Jika lebih dari 1 kata, gunakan underscore
* Wajib prefix `__`

```ts
const __max_reminder_limit = 10;
```

---

## PERATURAN STYLING CODING 4. FORMATTING

* Kode harus rapi dan konsisten
* Operator **WAJIB sejajar**:

  * `=`
  * `:`
  * `from`
* Gunakan indentasi konsisten
* Tidak ada trailing whitespace
* Hindari line kosong berlebihan

Contoh:

```ts
const user_id        = interaction.user.id;
const reminder_time = payload.time;
const message       = payload.message;
```

---

## PERATURAN STYLING CODING 5. FILE & FOLDER STRUCTURE

* Struktur folder **WAJIB konsisten**
* Jangan taruh file di folder yang tidak relevan
* Satu file = satu tanggung jawab utama
* Hindari file god-object

---

## PERATURAN STYLING CODING 6. FUNCTION RULES

* Function harus:

  * pendek
  * fokus ke satu tujuan
  * mudah dites
* Hindari nested logic berlebihan
* Gunakan early return bila perlu
* DILARANG logic duplikat

---

## PERATURAN STYLING CODING 7. ARCHITECTURE

* Pisahkan dengan jelas:

  * command / handler
  * controller
  * service / helper
* Business logic **DILARANG** di command
* Controller berbasis fitur

Contoh alur:

```
command
→ controller
→ service / utils
```

---

## PERATURAN STYLING CODING 8. IMPORT & DEPENDENCY

* Import harus terurut:

  1. core / builtin
  2. external dependency
  3. internal project
* Hindari circular dependency
* Jangan import yang tidak digunakan

---

## PERATURAN STYLING CODING 9. COMMENT

* Comment hanya untuk logic penting
* Jangan menjelaskan hal yang sudah jelas dari kode
* Format comment **1 baris saja**:

```ts
// - VALIDATE INPUT - \\
```

---

## PERATURAN STYLING CODING 10. TYPE & SAFETY

* Hindari `any`
* Gunakan type / interface bila perlu
* Jangan asumsi data valid
* Pastikan function contract jelas

---

## PERATURAN STYLING CODING 11. PERFORMANCE

* Hindari operasi berat di loop
* Cache hasil yang sering dipakai
* Minimalkan alloc object tidak perlu
* Jangan fetch / query berulang tanpa alasan

---

## PERATURAN STYLING CODING 12. DOCUMENTATION

* Setiap function **WAJIB JSDoc**
* Minimal:

  * `@param`
  * `@return`

```ts
/**
 * Create reminder
 * @param user_id string
 * @param message string
 * @return Promise<void>
 */
```

---

## PERATURAN STYLING CODING 13. FINAL CHECK

* Tidak ada error TypeScript / linter
* Tidak ada unused code
* Struktur file sesuai project
* Kode mudah dibaca tanpa konteks tambahan