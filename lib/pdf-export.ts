/**
 * In-Page PDF Generator
 * Compiles and downloads Members Book / Ficha PDFs directly on the current page
 * without opening new browser tabs or views.
 */

export async function generatePdfDirectlyInPage(
  memberId?: string,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<boolean> {
  let container: HTMLElement | null = null;
  try {
    if (onProgress) onProgress(0, 100, 'Carregando dados dos mentorados...');

    const url = memberId ? `/api/export-pdf?member_id=${encodeURIComponent(memberId)}` : '/api/export-pdf';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao obter conteúdo do relatório.');

    const htmlText = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    // Create off-screen container in DOM for html2canvas rendering
    container = document.createElement('div');
    container.id = 'pdf-render-hidden-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '210mm';
    container.style.height = 'auto';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-999999';
    container.style.backgroundColor = '#07192B';

    // Include style tags
    const styleTags = Array.from(doc.head.querySelectorAll('style, link'))
      .map((el) => el.outerHTML)
      .join('\n');

    const mainContent = doc.getElementById('pdf-main-content') || doc.body;
    container.innerHTML = styleTags + mainContent.innerHTML;
    document.body.appendChild(container);

    // Wait for fonts & images
    if ((document as any).fonts && (document as any).fonts.ready) {
      await (document as any).fonts.ready;
    }

    const imgs = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) resolve(true);
            else {
              img.onload = () => resolve(true);
              img.onerror = () => resolve(true);
            }
          })
      )
    );

    await new Promise((r) => setTimeout(r, 400));

    const pages = container.querySelectorAll('.a4-page');
    const totalPages = pages.length;
    if (totalPages === 0) throw new Error('Nenhuma página A4 encontrada para exportação.');

    // Dynamic import to avoid SSR errors
    const { jsPDF } = await import('jspdf');
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default || html2canvasModule;

    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
    });

    for (let i = 0; i < totalPages; i++) {
      const pageEl = pages[i] as HTMLElement;
      const currentNum = i + 1;

      if (onProgress) {
        onProgress(currentNum, totalPages, `Renderizando página ${currentNum} de ${totalPages}...`);
      }

      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#07192B',
        logging: false,
        windowWidth: 1200,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    if (onProgress) onProgress(totalPages, totalPages, 'Finalizando download do arquivo PDF...');

    const memberName = doc.querySelector('.member-name')?.textContent?.trim();
    const sanitizedName = memberName ? memberName.replace(/[^a-zA-Z0-9_\-]/g, '_') : 'Mentorado';
    const filename = memberId ? `Ficha_${sanitizedName}.pdf` : `Members_Book_${new Date().getFullYear()}.pdf`;

    pdf.save(filename);

    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }

    return true;
  } catch (err) {
    console.error('Erro na geração direta do PDF:', err);
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    return false;
  }
}
