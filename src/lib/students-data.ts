/**
 * Daftar 43 mahasiswa S1 PGMI yang mengambil mata kuliah Kewarganegaraan.
 * Data ini di-seed ke database saat inisialisasi.
 *
 * Password awal setiap mahasiswa = NIM mereka sendiri (bisa diubah dosen kemudian).
 */
export type StudentSeed = { nim: string; name: string };

export const STUDENTS: StudentSeed[] = [
  { nim: "25104080001", name: "FATIHA SAJDA AJI" },
  { nim: "25104080002", name: "GHILMATUS SHOLIKHAH" },
  { nim: "25104080003", name: "KHOLIFAH USWATUN HASANAH" },
  { nim: "25104080004", name: "NURWASILA SAPUTRI" },
  { nim: "25104080005", name: "AHMAD ZINDANI HAFID RIDWAN" },
  { nim: "25104080006", name: "INTAN SHOFA MUZDALIFATUS SORAYA" },
  { nim: "25104080007", name: "AZKA ARIFAH" },
  { nim: "25104080008", name: "WAFIQ DESTI HIDAYATI" },
  { nim: "25104080009", name: "AZZAH NUR AZIZAH" },
  { nim: "25104080010", name: "FARAH ALFARINI ALFAROH" },
  { nim: "25104080011", name: "AZIZATUL AZKIA" },
  { nim: "25104080012", name: "MEIDYA SOFI AULIA" },
  { nim: "25104080013", name: "SALMA NADYA AZZAHRA" },
  { nim: "25104080014", name: "JIHAN KHULAIFA AL UMAMI" },
  { nim: "25104080015", name: "MEIDIA INTANI" },
  { nim: "25104080016", name: "MUHAMMAD HUSNI HIDAYAT" },
  { nim: "25104080017", name: "DWI AYU RAMADHANI" },
  { nim: "25104080018", name: "NGADHIFA KHOTIDJAH" },
  { nim: "25104080019", name: "SOFIANA NIRMALA" },
  { nim: "25104080020", name: "NAILAH MUMTAZAH" },
  { nim: "25104080021", name: "ZIDNA KHAUSA SAKINA" },
  { nim: "25104080022", name: "LESTARI" },
  { nim: "25104080023", name: "FATHIMAH NURMAULIDYA DEVI" },
  { nim: "25104080025", name: "HANIF KUSUMAWARDANI" },
  { nim: "25104080026", name: "RIFDA ZADA SALSABILA" },
  { nim: "25104080027", name: "CHUSNA KAMILA" },
  { nim: "25104080028", name: "RIZA NAYLA TADZKIRA" },
  { nim: "25104080029", name: "ROUDHOTUZZAAHIROH" },
  { nim: "25104080030", name: "SALMA AULIA YUMNA" },
  { nim: "25104080031", name: "YUSRANDA ABDILLAH SELOLONG" },
  { nim: "25104080032", name: "CHELSA RAMADHANI" },
  { nim: "25104080033", name: "ARELIA AHSAN EL-ZAD FIRDAUSI" },
  { nim: "25104080034", name: "TALINTHA TANIA TIYASA" },
  { nim: "25104080035", name: "LUTFIANA NUR AZIZA" },
  { nim: "25104080036", name: "JANNATUL ZAHRO" },
  { nim: "25104080037", name: "INDAH TRI LESTARI" },
  { nim: "25104080038", name: "ADIIBAH RAYYA PRATAMA" },
  { nim: "25104080039", name: "TANTY AULIA ZAHRA" },
  { nim: "25104080041", name: "ASSFA FAHNI AULIA" },
  { nim: "25104080042", name: "SULIS YULIAWATI" },
  { nim: "25104080043", name: "ESTETIKA DIAH TEJAWATI" },
  { nim: "25104080044", name: "WIDYA SOFWATUL MAWADDAH" },
  { nim: "25104080045", name: "RAHMALIA WIDIYA PUTRI" },
];
