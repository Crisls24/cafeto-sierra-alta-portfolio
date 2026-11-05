import { EMPRESA } from "./empresa";
import type { DocumentoLegal } from "./tipos";

/**
 * Textos legales del sitio: Aviso de Privacidad y Términos y Condiciones.
 *
 * El contenido vive aquí, no en las páginas. La identidad del responsable
 * (razón social, RFC y domicilio) se toma de `empresa.ts` para que un cambio
 * de datos fiscales actualice el aviso en un solo lugar.
 *
 * ADVERTENCIA: es una base redactada con el formato del Aviso de Privacidad
 * Simplificado del INAI y con las condiciones operativas de la marca. No
 * sustituye la revisión de un abogado.
 */

export const AVISO_PRIVACIDAD: DocumentoLegal = {
  titulo: "Aviso de Privacidad",
  resumen: `Aviso de Privacidad Simplificado de ${EMPRESA.marca}, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.`,
  vigencia: "Última actualización: noviembre de 2026",
  secciones: [
    {
      id: "responsable",
      titulo: "I. Identidad y domicilio del responsable",
      parrafos: [
        `${EMPRESA.razonSocial}, con nombre comercial ${EMPRESA.marca}, con Registro Federal de Contribuyentes ${EMPRESA.rfc} y domicilio en ${EMPRESA.domicilioLegal}, es responsable del tratamiento de los datos personales que usted nos proporcione, de conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (en adelante, la "Ley").`,
        `Para cualquier asunto relacionado con el presente Aviso, puede contactarnos en el correo ${EMPRESA.correoNegocios} o al teléfono el contacto ficticio indicado en esta demostración.`,
      ],
    },
    {
      id: "datos",
      titulo: "II. Datos personales que recabamos",
      parrafos: [
        "Dependiendo de la forma en que se comunique con nosotros, podemos recabar los siguientes datos personales:",
      ],
      lista: [
        "Datos de contacto: nombre y número de teléfono, cuando nos escribe por WhatsApp.",
        "Datos de facturación: nombre o razón social, Registro Federal de Contribuyentes y demás datos fiscales, cuando solicita un comprobante (CFDI).",
        "Datos de identificación pública en reseñas: el nombre público y la opinión que usted decida compartir en nuestro sistema de reseñas verificadas, asociados a un pedido entregado.",
        "Identificación opcional con Google: si elige continuar con Google, verificamos el nombre y un identificador de su cuenta. Conservamos ese identificador de forma privada junto a su reseña; puede elegir un nombre público distinto. No almacenamos su correo, fotografía ni el token de Google. También registramos la versión y la fecha de su autorización de publicación. Puede enviar su opinión sin iniciar sesión.",
        "Datos técnicos de navegación: dirección IP y datos del dispositivo, que registra nuestro proveedor de infraestructura al cargar el sitio y aplicar sus medidas de seguridad.",
      ],
    },
    {
      id: "finalidades-primarias",
      titulo: "III. Finalidades primarias",
      parrafos: [
        "Estas finalidades son necesarias para atender la relación que usted nos solicita:",
      ],
      lista: [
        "Atender sus solicitudes de cotización y dar seguimiento a su pedido.",
        "Coordinar la entrega de los productos.",
        "Emitir y enviar los comprobantes fiscales (CFDI).",
        "Publicar, previa moderación, las reseñas que usted envíe.",
      ],
    },
    {
      id: "finalidades-secundarias",
      titulo: "IV. Finalidades secundarias",
      parrafos: [
        "De manera adicional, y solo si usted no se opone, podemos usar sus datos para enviarle información sobre productos, promociones o novedades.",
        `Si no desea que sus datos se traten para esta finalidad secundaria, puede manifestarlo escribiendo a ${EMPRESA.correoNegocios}. Su negativa no es motivo para negarle los productos o servicios que solicita.`,
      ],
    },
    {
      id: "transferencias",
      titulo: "V. Transferencias de datos",
      parrafos: [
        "Sus datos pueden ser tratados por terceros que nos prestan servicios necesarios para operar el sitio y atenderle, en su carácter de encargados. En ningún caso vendemos, rentamos ni compartimos sus datos personales con fines distintos a los aquí descritos:",
      ],
      lista: [
        "Meta Platforms, Inc. (WhatsApp), cuando usted inicia la conversación por ese canal; ese tratamiento se rige también por las políticas de privacidad de la plataforma.",
        "Cloudflare, Inc., proveedor de infraestructura que aloja el sitio, la base de datos de reseñas y las medidas de seguridad, incluida la verificación anti-robots.",
        "Google: el botón de identificación se carga en la bienvenida de una invitación válida. Utilizarlo es opcional; puede continuar sin cuenta. Las opiniones de Google Maps se consultan por separado y muestran la atribución pública de su autor, incluida su fotografía y enlace al perfil cuando estén disponibles. Al cargar el botón o las fotografías, su navegador se comunica con Google. Este uso está sujeto a la política de privacidad de Google.",
      ],
      enlaces: [{ texto: "Política de privacidad de Google", url: "https://policies.google.com/privacy" }],
    },
    {
      id: "cookies",
      titulo: "VI. Uso de cookies y tecnologías",
      parrafos: [
        "La bienvenida puede utilizar una cookie técnica temporal de 15 minutos para preparar la identificación con Google. Esa cookie vincula la verificación con su navegador y se elimina tras enviar una reseña identificada con Google. No es necesaria para opinar sin cuenta. También se usan las medidas técnicas del proveedor de infraestructura.",
      ],
    },
    {
      id: "arco",
      titulo: "VII. Sus derechos ARCO",
      parrafos: [
        "Usted tiene derecho a conocer qué datos tenemos (Acceso), solicitar su corrección (Rectificación), pedir que los eliminemos (Cancelación) y oponerse a su uso (Oposición), conocidos como derechos ARCO.",
        `Para ejercer cualquiera de estos derechos, envíe su solicitud al correo ${EMPRESA.correoNegocios}, indicando su nombre, un medio para responderle y el derecho que desea ejercer. Le daremos respuesta en los plazos que marca la Ley.`,
      ],
    },
    {
      id: "seguridad",
      titulo: "VIII. Cómo protegemos sus datos",
      parrafos: [
        "Aplicamos medidas de seguridad administrativas y técnicas razonables para proteger sus datos personales contra daño, pérdida, alteración o acceso no autorizado. En el sistema de reseñas no almacenamos teléfonos, direcciones ni correos, y los tokens de invitación se guardan mediante un hash, sin conservar el enlace original.",
      ],
    },
    {
      id: "cambios",
      titulo: "IX. Cambios al presente aviso",
      parrafos: [
        "Cualquier cambio a este Aviso de Privacidad se publicará en esta misma página. Le recomendamos revisarla periódicamente.",
      ],
    },
  ],
};

export const TERMINOS: DocumentoLegal = {
  titulo: "Términos y Condiciones",
  resumen:
    "Condiciones aplicables a las cotizaciones, pedidos y entregas de productos de Cafeto Sierra Alta.",
  vigencia: "Última actualización: octubre de 2026",
  secciones: [
    {
      id: "google-maps",
      titulo: "Opiniones de Google Maps",
      parrafos: [
        "Las opiniones de Google Maps pertenecen a sus autores y se muestran con su atribución, separadas de las opiniones recibidas directamente en Cafeto Sierra Alta. La API de Google selecciona hasta cinco por relevancia; puede consultar el perfil completo mediante el enlace de la sección. No se trasladan opiniones de un sistema al otro. El uso del contenido de Google Maps está sujeto a los Términos del Servicio de Google y los términos adicionales de Google Maps.",
      ],
      enlaces: [
        { texto: "Términos del Servicio de Google", url: "https://policies.google.com/terms" },
        { texto: "Términos adicionales de Google Maps", url: "https://maps.google.com/help/terms_maps/" },
      ],
    },
    {
      id: "proveedor",
      titulo: "I. Identificación del proveedor",
      parrafos: [
        `${EMPRESA.razonSocial}, con nombre comercial ${EMPRESA.marca} y domicilio en ${EMPRESA.domicilioLegal}, es quien ofrece los productos descritos en este sitio.`,
      ],
    },
    {
      id: "cotizaciones",
      titulo: "II. Cotizaciones y precios",
      parrafos: [
        "La información publicada en el sitio es informativa y no constituye una oferta vinculante. La cotización formal se realiza por WhatsApp o correo electrónico.",
        "Los precios pueden cambiar sin previo aviso, en función del costo del grano verde, los empaques y la disponibilidad de temporada. El precio aplicable es el que se confirme en la cotización.",
        "Podrán aplicar montos mínimos de pedido, que se indicarán en la cotización correspondiente.",
        "No se considera celebrado ningún pedido hasta que ambas partes confirmen por escrito, por WhatsApp o correo electrónico, el producto, la cantidad, el precio y la fecha de entrega.",
      ],
    },
    {
      id: "disponibilidad",
      titulo: "III. Productos y disponibilidad",
      parrafos: [
        "Nuestros quesos y demás productos son de elaboración artesanal y están sujetos a disponibilidad de producción. Los pedidos se sujetan a existencias.",
        "Las entregas de queso en zonas que requieren cadena de frío están sujetas a la logística disponible. Si no es posible garantizarla, se le informará antes de confirmar el pedido.",
      ],
    },
    {
      id: "entregas",
      titulo: "IV. Entregas",
      parrafos: [
        "Las zonas y fechas de entrega se confirman en la cotización. La Zona Metropolitana cuenta con entrega programada, sujeta a confirmación.",
        "Los tiempos de entrega son estimados y pueden variar por causas ajenas a nosotros.",
      ],
    },
    {
      id: "facturacion",
      titulo: "V. Facturación",
      parrafos: [
        "Los comprobantes fiscales (CFDI) se solicitan dentro del mes en que se realiza la compra. Después de ese plazo no será posible emitir la factura.",
        "Para emitir el comprobante necesitamos los datos fiscales completos que usted nos proporcione.",
      ],
    },
    {
      id: "aceptacion",
      titulo: "VI. Aceptación",
      parrafos: [
        "El uso de este sitio y la solicitud de una cotización implican su conformidad con estos Términos y Condiciones y con nuestro Aviso de Privacidad.",
      ],
    },
  ],
};
