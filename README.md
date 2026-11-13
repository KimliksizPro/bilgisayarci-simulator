# Bilgisayarcı Simülatör

Tarayıcıda çalışan 3D bir bilgisayarcı dükkanı simülasyonu. Müşteriler gelir, sen bilgisayar toplar ya da arızalı sistemi tamir edersin.

## Nasıl çalıştırılır

Kurulum gerekmez. Herhangi bir statik sunucuyla aç:

```bash
python3 -m http.server 8000
# sonra tarayıcıda http://localhost:8000
```

(Dosyayı doğrudan `file://` ile açmak ES modülleri yüzünden çalışmaz.)

## Oynanış

- **Toplama işleri:** Servis fişindeki anakartın soketine (AM5 / LGA1700) ve RAM tipine (DDR4 / DDR5) uygun parçaları tak. Müşterinin isteklerini (RAM, oyun puanı, depolama) karşıla, bütçenin altında kal; aradaki fark senin kârın.
- **Arıza işleri:** Güç düğmesine bas, bip seslerini ve anakarttaki hata ışıklarını (CPU / DRAM / VGA / BOOT) izle. Bozuk parçayı bul, değiştir.
- **Güç:** Sistemin çektiği watt, güç kaynağının kapasitesini aşarsa bilgisayar yük altında kapanır.
- **Isınma:** Kurumuş termal macun işlemciyi 100°C'ye çıkarır, sistem kendini kapatır. "Sarf" sekmesinden yeni macun sür.
- **POST kartı:** Açılışta iki haneli kod gösterir (19 işlemci, 34 bellek, 92 grafik, A2 disk, A0 sistem açık; 00 / 55 / d6 hata).
- Her 3 müşteride bir gün geçer ve dükkan kirası ödenir.

## Kısayollar

`1` `2` `3` kamera · `G` güç · `M` ses · `K` grafik kalitesi (kare hızı düşükse kendiliğinden düşer)

## Kod yapısı

| Dosya | İçerik |
|---|---|
| `index.html` | Arayüz (üst bar, servis fişi, katalog) ve stiller |
| `src/main.js` | Sahne, kamera, oyun döngüsü, parça takma, açılış testi, işler |
| `src/models.js` | Kodla üretilen tüm 3D modeller (dükkan, kasa, anakart, parçalar) |
| `src/data.js` | Parça kataloğu, anakartlar, müşteri işi üretimi, sistem hesapları |
| `src/audio.js` | Web Audio ile sentezlenen sesler |

3D motoru: [three.js](https://threejs.org) r170 (CDN'den yüklenir).
