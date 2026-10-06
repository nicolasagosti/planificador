// Development data: the clients and calendars of the approved mockups
// (docs/SPEC.md, section 10). With APP_FAKE_TODAY=2026-10-05 the screens must
// match the PNGs in docs/mockups.
import type { Format, Network } from "@/domain/catalog";
import type { CalendarStatus, PieceStatus } from "@/domain/statuses";

export type SeedPiece = {
  date: string;
  format: Format;
  network: Network;
  topic: string;
  idea?: string;
  status: PieceStatus;
  /** Days it was marked done and delivered. */
  doneOn?: string;
  deliveredOn?: string;
  asset?: { name: string; url: string };
};

export type SeedCalendar = {
  /** First day of the month. */
  month: string;
  status: CalendarStatus;
  sentOn?: string;
  approvedOn?: string;
  pieces: SeedPiece[];
};

export type SeedClient = {
  name: string;
  industry: string;
  contactName?: string;
  contactPhone?: string;
  networks: Network[];
  approvalNotes?: string;
  notes?: string;
  clientSince?: string;
  calendars: SeedCalendar[];
};

function pending(
  date: string,
  format: Format,
  network: Network,
  topic: string,
  idea?: string,
): SeedPiece {
  return { date, format, network, topic, idea, status: "pending" };
}

function done(piece: SeedPiece, doneOn: string): SeedPiece {
  return { ...piece, status: "done", doneOn };
}

function delivered(
  piece: SeedPiece,
  doneOn: string,
  deliveredOn: string,
): SeedPiece {
  return { ...piece, status: "delivered", doneOn, deliveredOn };
}

function withAsset(piece: SeedPiece, name: string): SeedPiece {
  const slug = name.replace(/\.[a-z0-9]+$/, "");
  return {
    ...piece,
    asset: {
      name,
      url: `https://drive.google.com/file/d/ejemplo-${slug}/view`,
    },
  };
}

// Past months were delivered on time: made two days before, delivered the day
// before. Plain UTC arithmetic on calendar days.
function deliveredOnTime(piece: SeedPiece): SeedPiece {
  const daysBefore = (n: number) => {
    const [year, month, day] = piece.date.split("-").map(Number);
    const shifted = new Date(
      Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) - n),
    );
    return shifted.toISOString().slice(0, 10);
  };
  return delivered(piece, daysBefore(2), daysBefore(1));
}

const cafeLumbreAugust: SeedCalendar = {
  month: "2026-08-01",
  status: "approved",
  sentOn: "2026-07-27",
  approvedOn: "2026-07-29",
  pieces: [
    pending("2026-08-01", "story", "instagram", "Promo de agosto"),
    pending("2026-08-04", "post", "instagram", "Nuevo tostado de la casa"),
    pending("2026-08-06", "reel", "instagram", "Cómo preparamos el cold brew"),
    pending("2026-08-08", "post", "facebook", "Horarios de agosto"),
    pending("2026-08-11", "carousel", "instagram", "Tres métodos de filtrado"),
    pending("2026-08-13", "story", "instagram", "Encuesta: ¿con o sin azúcar?"),
    pending("2026-08-16", "post", "instagram", "Feliz Día de las Infancias"),
    pending("2026-08-19", "reel", "instagram", "Un día en la tostadora"),
    pending("2026-08-22", "post", "facebook", "Brunch de fin de semana"),
    pending("2026-08-25", "carousel", "instagram", "Maridajes con pastelería"),
    pending("2026-08-27", "story", "instagram", "La barra nueva"),
    pending("2026-08-30", "post", "instagram", "Gracias por agosto"),
  ].map(deliveredOnTime),
};

const cafeLumbreSeptember: SeedCalendar = {
  month: "2026-09-01",
  status: "approved",
  sentOn: "2026-08-24",
  approvedOn: "2026-08-27",
  pieces: [
    pending("2026-09-01", "post", "instagram", "Llega la primavera"),
    pending("2026-09-03", "reel", "instagram", "Latte de pistacho"),
    pending("2026-09-05", "story", "instagram", "Dos por uno en tostados"),
    pending("2026-09-08", "post", "facebook", "Horarios de septiembre"),
    pending("2026-09-10", "carousel", "instagram", "Guía de orígenes"),
    pending(
      "2026-09-12",
      "story",
      "instagram",
      "Encuesta: ¿espresso o filtrado?",
    ),
    pending("2026-09-15", "post", "instagram", "Alfajores de la casa"),
    pending("2026-09-17", "reel", "instagram", "Así molemos el café"),
    pending("2026-09-19", "post", "facebook", "Música en vivo el sábado"),
    pending("2026-09-21", "post", "instagram", "Feliz Día de la Primavera"),
    pending("2026-09-23", "carousel", "instagram", "Cinco cafés para la tarde"),
    pending("2026-09-25", "story", "instagram", "Un turno en la barra"),
    pending(
      "2026-09-28",
      "reel",
      "instagram",
      "Café de especialidad en 30 segundos",
    ),
    pending("2026-09-30", "post", "instagram", "Lo que viene en octubre"),
  ].map(deliveredOnTime),
};

// The calendar of the mockups, with the ideas of 03-calendario.mockup.html.
const cafeLumbreOctober: SeedCalendar = {
  month: "2026-10-01",
  status: "approved",
  sentOn: "2026-09-24",
  approvedOn: "2026-09-28",
  pieces: [
    withAsset(
      delivered(
        pending(
          "2026-10-01",
          "reel",
          "instagram",
          "Día Internacional del Café",
          "El recorrido del grano hasta la taza, en veinte segundos.",
        ),
        "2026-09-28",
        "2026-09-29",
      ),
      "dia-del-cafe.mp4",
    ),
    pending(
      "2026-10-02",
      "post",
      "facebook",
      "Promo de octubre",
      "Café con medialuna a precio promocional, de lunes a jueves.",
    ),
    withAsset(
      delivered(
        pending(
          "2026-10-03",
          "story",
          "instagram",
          "Dos por uno en medialunas",
          "Historia con cuenta regresiva hasta el cierre del sábado.",
        ),
        "2026-09-30",
        "2026-10-01",
      ),
      "dos-por-uno.png",
    ),
    withAsset(
      delivered(
        pending(
          "2026-10-05",
          "carousel",
          "instagram",
          "Carta de primavera",
          "Cinco placas con las bebidas frías nuevas.",
        ),
        "2026-10-01",
        "2026-10-02",
      ),
      "carta-primavera.zip",
    ),
    withAsset(
      done(
        pending(
          "2026-10-07",
          "post",
          "facebook",
          "Horarios del feriado",
          "Aviso del horario reducido del lunes 12.",
        ),
        "2026-10-02",
      ),
      "horarios-feriado.png",
    ),
    withAsset(
      done(
        pending(
          "2026-10-08",
          "reel",
          "instagram",
          "Así hacemos el flat white",
          "Paso a paso en la barra, sin voz en off, con el sonido de la máquina.",
        ),
        "2026-10-04",
      ),
      "flat-white.mp4",
    ),
    pending(
      "2026-10-10",
      "story",
      "instagram",
      "Encuesta: ¿frío o caliente?",
      "Encuesta de dos opciones para elegir la bebida de la semana.",
    ),
    pending(
      "2026-10-13",
      "post",
      "instagram",
      "Nuevo blend de Colombia",
      "Foto del paquete con las notas de cata.",
    ),
    pending(
      "2026-10-15",
      "reel",
      "instagram",
      "Detrás de la barra",
      "Una mañana con el equipo, de la apertura al primer pedido.",
    ),
    pending(
      "2026-10-17",
      "story",
      "instagram",
      "Desayuno para regalar",
      "Caja de desayuno para el Día de la Madre, con link para encargarla.",
    ),
    pending(
      "2026-10-18",
      "post",
      "instagram",
      "Feliz Día de la Madre",
      "Saludo con una foto del local.",
    ),
    pending(
      "2026-10-21",
      "post",
      "facebook",
      "Taller de latte art",
      "Fecha, cupos y cómo anotarse.",
    ),
    pending(
      "2026-10-23",
      "carousel",
      "instagram",
      "Cinco tips para el café en casa",
      "Una placa por tip: molienda, agua, proporción, tiempo y taza.",
    ),
    pending(
      "2026-10-27",
      "reel",
      "instagram",
      "Clientes de la casa",
      "Tres clientes cuentan qué piden siempre.",
    ),
    pending(
      "2026-10-30",
      "post",
      "instagram",
      "Lo que viene en noviembre",
      "Adelanto de la carta de noviembre.",
    ),
  ],
};

const cafeLumbreNovember: SeedCalendar = {
  month: "2026-11-01",
  status: "draft",
  pieces: [
    pending("2026-11-03", "post", "instagram", "Carta de noviembre"),
    pending("2026-11-10", "reel", "instagram", "Nuevo blend de Etiopía"),
    pending("2026-11-17", "story", "instagram", "Encuesta de temporada"),
    pending("2026-11-24", "post", "facebook", "Encargos para las fiestas"),
  ],
};

export const seedClients: SeedClient[] = [
  {
    name: "Óptica Mirador",
    industry: "Óptica",
    contactName: "Martín Ferreyra, socio",
    contactPhone: "11 5555-0187",
    networks: ["instagram", "facebook"],
    approvalNotes: "Por mail. Responde en el día.",
    notes: "Mencionar siempre las obras sociales con las que trabajan.",
    clientSince: "2026-03-01",
    calendars: [
      {
        month: "2026-10-01",
        status: "approved",
        sentOn: "2026-09-25",
        approvedOn: "2026-09-29",
        pieces: [
          delivered(
            pending(
              "2026-10-01",
              "post",
              "instagram",
              "Nueva colección de armazones",
              "Foto de la vidriera con los armazones nuevos.",
            ),
            "2026-09-30",
            "2026-10-01",
          ),
          pending(
            "2026-10-02",
            "post",
            "facebook",
            "Control visual sin cargo",
            "Turnos sin cargo durante octubre, con link para reservar.",
          ),
          pending(
            "2026-10-03",
            "story",
            "instagram",
            "Anteojos de sol en promoción",
          ),
          pending(
            "2026-10-08",
            "reel",
            "instagram",
            "Cómo elegir el armazón para tu cara",
          ),
          pending(
            "2026-10-13",
            "carousel",
            "instagram",
            "Cuidados de los lentes de contacto",
          ),
          pending(
            "2026-10-17",
            "story",
            "instagram",
            "Encuesta: ¿metal o acetato?",
          ),
          pending(
            "2026-10-22",
            "post",
            "facebook",
            "Trabajamos con obras sociales",
          ),
          pending(
            "2026-10-28",
            "reel",
            "instagram",
            "Así armamos tus anteojos",
          ),
        ],
      },
    ],
  },
  {
    name: "Café Lumbre",
    industry: "Cafetería de especialidad",
    contactName: "Carla Benítez, dueña",
    contactPhone: "11 5555-0142",
    networks: ["instagram", "facebook"],
    approvalNotes: "Por WhatsApp. Suele tardar dos o tres días.",
    notes:
      "Tono cercano, sin emojis en los copies. Las fotos del local las manda ella los lunes.",
    clientSince: "2026-07-01",
    calendars: [
      cafeLumbreAugust,
      cafeLumbreSeptember,
      cafeLumbreOctober,
      cafeLumbreNovember,
    ],
  },
  {
    name: "Vivero Las Lilas",
    industry: "Vivero",
    contactName: "Ana Sosa, encargada",
    contactPhone: "11 5555-0123",
    networks: ["instagram", "facebook"],
    approvalNotes: "Por WhatsApp, los viernes.",
    notes: "Fotos propias del vivero, nada de bancos de imágenes.",
    clientSince: "2025-11-01",
    calendars: [
      {
        month: "2026-10-01",
        status: "approved",
        sentOn: "2026-09-27",
        approvedOn: "2026-09-30",
        pieces: [
          delivered(
            pending(
              "2026-10-01",
              "post",
              "instagram",
              "Llegaron los plantines de estación",
            ),
            "2026-09-30",
            "2026-10-01",
          ),
          delivered(
            pending(
              "2026-10-03",
              "story",
              "instagram",
              "Taller de huerta en balcón",
            ),
            "2026-10-01",
            "2026-10-02",
          ),
          delivered(
            pending(
              "2026-10-05",
              "carousel",
              "instagram",
              "Cinco plantas de interior para poca luz",
            ),
            "2026-10-02",
            "2026-10-03",
          ),
          done(
            pending(
              "2026-10-06",
              "reel",
              "instagram",
              "Cómo trasplantar sin dañar las raíces",
            ),
            "2026-10-02",
          ),
          done(
            pending(
              "2026-10-09",
              "post",
              "facebook",
              "Horarios del fin de semana largo",
            ),
            "2026-10-03",
          ),
          done(
            pending(
              "2026-10-12",
              "story",
              "instagram",
              "Promo en macetas de barro",
            ),
            "2026-10-03",
          ),
          done(
            pending("2026-10-14", "post", "instagram", "Rosales en flor"),
            "2026-10-04",
          ),
          pending("2026-10-16", "reel", "instagram", "Un día en el vivero"),
          pending(
            "2026-10-19",
            "carousel",
            "instagram",
            "Plagas comunes de primavera",
          ),
          pending("2026-10-23", "post", "facebook", "Envíos a domicilio"),
          pending(
            "2026-10-27",
            "story",
            "instagram",
            "Encuesta: ¿sol o sombra?",
          ),
          pending(
            "2026-10-30",
            "post",
            "instagram",
            "Lo que llega en noviembre",
          ),
        ],
      },
    ],
  },
  {
    name: "Panadería La Espiga",
    industry: "Panadería",
    contactName: "Jorge Medina, dueño",
    contactPhone: "11 5555-0164",
    networks: ["instagram", "facebook"],
    approvalNotes: "Por WhatsApp. Aprueba rápido.",
    notes: "Publicar temprano: el pan sale a las siete.",
    clientSince: "2025-05-01",
    calendars: [
      {
        month: "2026-10-01",
        status: "approved",
        sentOn: "2026-09-22",
        approvedOn: "2026-09-25",
        pieces: [
          delivered(
            pending(
              "2026-10-01",
              "post",
              "instagram",
              "Pan de masa madre todos los días",
            ),
            "2026-09-28",
            "2026-09-29",
          ),
          delivered(
            pending(
              "2026-10-02",
              "story",
              "instagram",
              "Recién salido del horno",
            ),
            "2026-09-28",
            "2026-09-30",
          ),
          delivered(
            pending(
              "2026-10-03",
              "reel",
              "instagram",
              "Así amasamos las medialunas",
            ),
            "2026-09-29",
            "2026-10-01",
          ),
          delivered(
            pending("2026-10-04", "post", "facebook", "Abrimos los domingos"),
            "2026-09-30",
            "2026-10-02",
          ),
          delivered(
            pending(
              "2026-10-05",
              "carousel",
              "instagram",
              "Cuatro panes para el desayuno",
            ),
            "2026-10-01",
            "2026-10-03",
          ),
          delivered(
            pending(
              "2026-10-06",
              "story",
              "instagram",
              "Encuesta: ¿dulce o salado?",
            ),
            "2026-10-02",
            "2026-10-04",
          ),
          done(
            pending(
              "2026-10-07",
              "post",
              "instagram",
              "Budín de limón de temporada",
            ),
            "2026-10-02",
          ),
          done(
            pending(
              "2026-10-09",
              "reel",
              "instagram",
              "Facturas del fin de semana",
            ),
            "2026-10-03",
          ),
          done(
            pending("2026-10-12", "post", "facebook", "Horario del feriado"),
            "2026-10-04",
          ),
          pending("2026-10-14", "story", "instagram", "Pan dulce por encargo"),
          pending(
            "2026-10-21",
            "carousel",
            "instagram",
            "Cómo conservar el pan",
          ),
          pending(
            "2026-10-28",
            "post",
            "instagram",
            "Encargos para fin de año",
          ),
        ],
      },
    ],
  },
  {
    name: "Estudio Pampa",
    industry: "Estudio de arquitectura",
    contactName: "Lucía Quiroga, arquitecta",
    contactPhone: "11 5555-0175",
    networks: ["instagram", "facebook"],
    approvalNotes: "Por mail, con copia a su socio.",
    clientSince: "2026-09-01",
    calendars: [
      {
        month: "2026-10-01",
        status: "sent",
        sentOn: "2026-10-01",
        pieces: [
          pending(
            "2026-10-02",
            "post",
            "instagram",
            "Casa en Tandil: antes y después",
          ),
          pending(
            "2026-10-06",
            "carousel",
            "instagram",
            "Cinco ideas para ganar luz natural",
          ),
          pending(
            "2026-10-09",
            "reel",
            "instagram",
            "Recorrido por la obra de Palermo",
          ),
          pending(
            "2026-10-14",
            "post",
            "facebook",
            "Charla abierta sobre reformas",
          ),
          pending(
            "2026-10-17",
            "story",
            "instagram",
            "Encuesta: ¿ladrillo o madera?",
          ),
          pending(
            "2026-10-21",
            "carousel",
            "instagram",
            "Materiales para climas húmedos",
          ),
          pending("2026-10-26", "reel", "instagram", "Del boceto al render"),
          pending("2026-10-29", "post", "instagram", "Proyecto del mes"),
        ],
      },
    ],
  },
  {
    name: "Impulso Funcional",
    industry: "Gimnasio",
    contactName: "Diego Romero, profesor",
    contactPhone: "11 5555-0196",
    networks: ["instagram", "tiktok"],
    approvalNotes: "Por WhatsApp.",
    clientSince: "2026-09-01",
    calendars: [
      {
        month: "2026-10-01",
        status: "draft",
        pieces: [
          pending("2026-10-05", "reel", "tiktok", "Rutina de diez minutos"),
          pending(
            "2026-10-08",
            "post",
            "instagram",
            "Horarios de las clases grupales",
          ),
          pending(
            "2026-10-13",
            "carousel",
            "instagram",
            "Errores comunes en la sentadilla",
          ),
          pending(
            "2026-10-16",
            "reel",
            "instagram",
            "Clase de funcional al aire libre",
          ),
          pending("2026-10-22", "story", "instagram", "Desafío de octubre"),
          pending("2026-10-29", "reel", "tiktok", "Testimonio de un alumno"),
        ],
      },
    ],
  },
];
