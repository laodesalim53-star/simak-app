// Daftar semua jenis proposal. Tambah jenis baru: buat file komponen di folder ini lalu daftarkan di sini.
import ProposalRKB, { config as c_0 } from "./ProposalRKB";
import ProposalPerpustakaan, { config as c_1 } from "./ProposalPerpustakaan";
import ProposalToiletBaru, { config as c_2 } from "./ProposalToiletBaru";
import ProposalPagar, { config as c_3 } from "./ProposalPagar";
import ProposalRumahDinas, { config as c_4 } from "./ProposalRumahDinas";
import ProposalRehabKelas, { config as c_5 } from "./ProposalRehabKelas";
import ProposalRehabAtap, { config as c_6 } from "./ProposalRehabAtap";
import ProposalRehabToilet, { config as c_7 } from "./ProposalRehabToilet";
import ProposalRehabPerpustakaan, { config as c_8 } from "./ProposalRehabPerpustakaan";
import ProposalRehabRumahDinas, { config as c_9 } from "./ProposalRehabRumahDinas";
import ProposalRehabMasjid, { config as c_10 } from "./ProposalRehabMasjid";
import ProposalRehabGereja, { config as c_11 } from "./ProposalRehabGereja";
import ProposalMebeler, { config as c_12 } from "./ProposalMebeler";
import ProposalKomputer, { config as c_13 } from "./ProposalKomputer";

export const DAFTAR = [
  { config: c_0, Komponen: ProposalRKB },
  { config: c_1, Komponen: ProposalPerpustakaan },
  { config: c_2, Komponen: ProposalToiletBaru },
  { config: c_3, Komponen: ProposalPagar },
  { config: c_4, Komponen: ProposalRumahDinas },
  { config: c_5, Komponen: ProposalRehabKelas },
  { config: c_6, Komponen: ProposalRehabAtap },
  { config: c_7, Komponen: ProposalRehabToilet },
  { config: c_8, Komponen: ProposalRehabPerpustakaan },
  { config: c_9, Komponen: ProposalRehabRumahDinas },
  { config: c_10, Komponen: ProposalRehabMasjid },
  { config: c_11, Komponen: ProposalRehabGereja },
  { config: c_12, Komponen: ProposalMebeler },
  { config: c_13, Komponen: ProposalKomputer },
];
