export type BuildQuotePdfArgs = {
  quoteId: string;
  createdAtIso?: string;
  showroomReference?: string;
  estimate?: unknown;
  contact?: unknown;
  program?: unknown;
  selectedOptions?: unknown;
  guidelines?: unknown;
};

export async function buildQuotePdfBase64({ quoteId }: BuildQuotePdfArgs) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas-pro")]);
  const root = document.querySelector("#quote-pdf-root") as HTMLElement | null;
  if (!root) throw new Error("Quote preview root not found for PDF generation.");

  const rootWidth = Math.max(1, Math.round(root.scrollWidth || root.clientWidth || root.getBoundingClientRect().width || 1024));

  const scratch = document.createElement("div");
  scratch.setAttribute("data-pdf-scratch", "true");
  scratch.style.position = "absolute";
  scratch.style.left = "-99999px";
  scratch.style.top = "0";
  scratch.style.width = `${rootWidth}px`;
  scratch.style.pointerEvents = "none";
  scratch.style.background = "#ffffff";

  const clone = root.cloneNode(true) as HTMLElement;
  clone.style.display = "block";
  clone.style.width = `${rootWidth}px`;
  clone.style.background = "#ffffff";
  scratch.appendChild(clone);

  // Normalize colors to computed RGB so html2canvas doesn't trip on oklab/oklch values.
  const inlineComputedColors = (el: HTMLElement) => {
    const computed = window.getComputedStyle(el);
    const colorProps = [
      "color",
      "background-color",
      "border-color",
      "border-top-color",
      "border-right-color",
      "border-bottom-color",
      "border-left-color",
      "outline-color",
    ];
    colorProps.forEach((prop) => {
      const v = computed.getPropertyValue(prop);
      if (v) el.style.setProperty(prop, v);
    });

    el.style.setProperty("background-image", "none");
    el.style.setProperty("box-shadow", "none");
    el.style.setProperty("text-shadow", "none");

    Array.from(el.children).forEach((child) => inlineComputedColors(child as HTMLElement));
  };
  inlineComputedColors(clone);

  document.body.appendChild(scratch);

  try {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    const marginPt = 36;
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pdfWidth - marginPt * 2;
    const contentHeight = pdfHeight - marginPt * 2;

    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: clone.scrollWidth,
      onclone: (clonedDoc) => {
        const html = clonedDoc.documentElement;
        const body = clonedDoc.body;

        html.style.setProperty("color-scheme", "light");
        body.style.setProperty("background", "#ffffff");

        html.classList.remove("dark");
        body.classList.remove("dark");

        const style = clonedDoc.createElement("style");
        style.textContent = `
          html, body { background: #ffffff !important; color: #0f172a !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .app-shell-header { display: none !important; }
          .no-print { display: none !important; }
          [data-pdf-exclude="true"] { display: none !important; }
          [data-pdf-root="quote"] { background: #ffffff !important; }
          [data-pdf-root="quote"] * { filter: none !important; backdrop-filter: none !important; }
          body > :not([data-pdf-scratch="true"]) { display: none !important; }
        `;
        clonedDoc.head.appendChild(style);
      },
    });

    const imgData = canvas.toDataURL("image/png");
    const imgHeight = (canvas.height * contentWidth) / canvas.width;
    let y = marginPt;

    doc.addImage(imgData, "PNG", marginPt, y, contentWidth, imgHeight, undefined, "FAST");

    while (y + imgHeight > pdfHeight - marginPt) {
      y -= contentHeight;
      doc.addPage();
      doc.addImage(imgData, "PNG", marginPt, y, contentWidth, imgHeight, undefined, "FAST");
    }

    const dataUri = doc.output("datauristring");
    const base64 = dataUri.split(",")[1] ?? "";
    const tail = (quoteId ?? "").slice(-4).replace(/[^A-Za-z0-9]/g, "");
    const filename = tail ? `OSSOQ${tail}.pdf` : "OSSOQ.pdf";
    return { pdfBase64: base64, pdfFilename: filename };
  } finally {
    if (scratch.parentNode) {
      scratch.parentNode.removeChild(scratch);
    }
  }
}

