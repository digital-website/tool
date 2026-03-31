 // Tab switching
    function showTab(tabId) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelector('.tab[onclick="showTab(\''+tabId+'\')"]').classList.add('active');
      document.getElementById(tabId).classList.add('active');
    }

    let draggedItem = null;
    function addDragHandlers(li, list) {
      li.addEventListener('dragstart', () => { draggedItem = li; li.classList.add('dragging'); });
      li.addEventListener('dragend', () => { draggedItem = null; li.classList.remove('dragging'); });
      li.addEventListener('dragover', e => {
        e.preventDefault();
        const draggingOver = e.target;
        if (draggingOver && draggingOver !== draggedItem) {
          list.insertBefore(draggedItem, draggingOver.nextSibling);
        }
      });
    }

    // Merge PDFs
    function showFiles() {
      const files = Array.from(document.getElementById('pdfFiles').files);
      const list = document.getElementById('fileList');
      list.innerHTML = '';
      files.forEach(file => {
        const li = document.createElement('li');
        li.textContent = file.name;
        li.draggable = true;
        addDragHandlers(li, list);
        list.appendChild(li);
      });
    }
    async function mergePDFs(compress) {
      const files = Array.from(document.getElementById('pdfFiles').files);
      const listItems = document.querySelectorAll('#fileList li');
      if (files.length < 2) { alert("Please select at least two PDF files."); return; }
      const mergedPdf = await PDFLib.PDFDocument.create();
      for (const li of listItems) {
        const file = files.find(f => f.name === li.textContent);
        const pdf = await PDFLib.PDFDocument.load(await file.arrayBuffer());
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }
      if (compress) { mergedPdf.setTitle(""); mergedPdf.setAuthor(""); mergedPdf.setSubject(""); mergedPdf.setKeywords([]); }
      const mergedPdfBytes = await mergedPdf.save({ useObjectStreams: true });
      let outputName = prompt("Enter a name for the merged PDF file:", compress ? "merged_compressed.pdf" : "merged.pdf");
      if (!outputName) outputName = compress ? "merged_compressed.pdf" : "merged.pdf";
      const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = outputName; link.click();
    }

    // JPG to PDF
    function showImages() {
      const files = Array.from(document.getElementById('imgFiles').files);
      const list = document.getElementById('imgList'); list.innerHTML = '';
      files.forEach(file => {
        const li = document.createElement('li');
        li.textContent = file.name;
        li.draggable = true;
        addDragHandlers(li, list);
        list.appendChild(li);
      });
    }
    async function imagesToPdf() {
      const files = Array.from(document.getElementById('imgFiles').files);
      const listItems = document.querySelectorAll('#imgList li');
      if (files.length < 1) { alert("Please select at least one image file."); return; }
      const pdfDoc = await PDFLib.PDFDocument.create();
      for (const li of listItems) {
        const file = files.find(f => f.name === li.textContent);
        const imgBytes = new Uint8Array(await file.arrayBuffer());
        let img = file.type === "image/jpeg" ? await pdfDoc.embedJpg(imgBytes) : await pdfDoc.embedPng(imgBytes);
        const page = pdfDoc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      const pdfBytes = await pdfDoc.save();
      let outputName = prompt("Enter a name for the new PDF file:", "images.pdf");
      if (!outputName) outputName = "images.pdf";
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = outputName; link.click();
    }

    
  // PDF to JPG with preview + ZIP
  function showPdfList() {
    const files = Array.from(document.getElementById('pdfToJpg').files);
    const list = document.getElementById('pdfList'); list.innerHTML = '';
    files.forEach(file => {
      const li = document.createElement('li');
      li.textContent = file.name;
      li.draggable = true;
      addDragHandlers(li, list);
      list.appendChild(li);
    });
  }

  async function pdfsToImages() {
    const files = Array.from(document.getElementById('pdfToJpg').files);
    const listItems = document.querySelectorAll('#pdfList li');
    if (files.length < 1) { alert("Please select at least one PDF file."); return; }

    const baseName = prompt("Enter a base name for JPG files:", "pdf_page");
    if (!baseName) return;

    const outputDiv = document.getElementById('jpgOutput');
    outputDiv.innerHTML = '';
    const zip = new JSZip();

    for (const li of listItems) {
      const file = files.find(f => f.name === li.textContent);
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;

        // Show preview in browser
        outputDiv.appendChild(canvas);

// Trigger download for each page
        const link = document.createElement('a');
        link.href = canvas.toDataURL("image/jpeg");
        link.download = `${baseName}_${li.textContent}_page${pageNum}.jpg`;
        link.textContent = `Download ${li.textContent} page ${pageNum}`;
        outputDiv.appendChild(link);
        outputDiv.appendChild(document.createElement('br'));

        // Convert canvas to JPG and add to ZIP
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        const imgData = dataUrl.split(',')[1]; // base64 part
        zip.file(`${baseName}_${li.textContent}_page${pageNum}.jpg`, imgData, { base64: true });
      }
    }


    // Save ZIP file
    let zipName = prompt("Enter a name for the ZIP file:", baseName + "_images.zip");
    if (!zipName) zipName = baseName + "_images.zip";

    zip.generateAsync({ type: "blob" }).then(function(content) {
      saveAs(content, zipName);
    });
  }