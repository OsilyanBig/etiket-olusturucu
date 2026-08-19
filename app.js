// ===== ETIKET OLUŞTURUCU - APP.JS =====

document.addEventListener('DOMContentLoaded', function() {
    // Element referansları
    const form = document.getElementById('labelForm');
    const clearBtn = document.getElementById('clearBtn');
    const printBtn = document.getElementById('printBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const previewArea = document.getElementById('previewArea');
    const placeholder = document.getElementById('placeholder');
    const labelContainer = document.getElementById('labelContainer');
    const printActions = document.getElementById('printActions');
    const canvas = document.getElementById('labelCanvas');
    const ctx = canvas.getContext('2d');
    const printArea = document.getElementById('printArea');

    // Bugünkü tarihi varsayılan yap
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fdt').value = today;

    // ===== BARKOD OLUŞTURUCU (EAN-13) =====
    
    // EAN-13 encoding patterns
    const L_PATTERNS = [
        '0001101', '0011001', '0010011', '0111101', '0100011',
        '0110001', '0101111', '0111011', '0110111', '0001011'
    ];
    
    const G_PATTERNS = [
        '0100111', '0110011', '0011011', '0100001', '0011101',
        '0111001', '0000101', '0010001', '0001001', '0010111'
    ];
    
    const R_PATTERNS = [
        '1110010', '1100110', '1101100', '1000010', '1011100',
        '1001110', '1010000', '1000100', '1001000', '1110100'
    ];
    
    // İlk rakama göre L/G pattern seçim tablosu
    const FIRST_DIGIT_PATTERNS = [
        'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
        'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'
    ];

    function calculateEAN13CheckDigit(digits12) {
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(digits12[i]) * (i % 2 === 0 ? 1 : 3);
        }
        return (10 - (sum % 10)) % 10;
    }

    function encodeEAN13(barcodeStr) {
        // 12 veya 13 haneli olabilir
        let digits = barcodeStr.replace(/\D/g, '');
        
        if (digits.length < 12) {
            digits = digits.padStart(12, '0');
        }
        
        if (digits.length === 12) {
            digits += calculateEAN13CheckDigit(digits);
        }
        
        if (digits.length > 13) {
            digits = digits.substring(0, 13);
        }

        const firstDigit = parseInt(digits[0]);
        const pattern = FIRST_DIGIT_PATTERNS[firstDigit];
        
        let encoded = '';
        
        // Start guard
        encoded += '101';
        
        // Sol 6 rakam (index 1-6)
        for (let i = 0; i < 6; i++) {
            const digit = parseInt(digits[i + 1]);
            if (pattern[i] === 'L') {
                encoded += L_PATTERNS[digit];
            } else {
                encoded += G_PATTERNS[digit];
            }
        }
        
        // Center guard
        encoded += '01010';
        
        // Sağ 6 rakam (index 7-12)
        for (let i = 0; i < 6; i++) {
            const digit = parseInt(digits[i + 7]);
            encoded += R_PATTERNS[digit];
        }
        
        // End guard
        encoded += '101';
        
        return { encoded, digits };
    }

    function drawBarcode(ctx, x, y, width, height, barcodeStr) {
        const { encoded, digits } = encodeEAN13(barcodeStr);
        
        const totalModules = encoded.length; // 95 modül
        const moduleWidth = width / totalModules;
        const barcodeHeight = height - 18; // Rakamlar için alan
        
        // Barkod çizgilerini çiz
        for (let i = 0; i < encoded.length; i++) {
            if (encoded[i] === '1') {
                ctx.fillStyle = '#000000';
                ctx.fillRect(
                    x + i * moduleWidth,
                    y,
                    moduleWidth + 0.5, // Küçük overlap anti-aliasing için
                    barcodeHeight
                );
            }
        }
        
        // Barkod numarasını altına yaz
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${Math.max(10, Math.floor(moduleWidth * 7))}px 'Courier New', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(digits, x + width / 2, y + barcodeHeight + 2);
    }

    // ===== ETİKET ÇİZİMİ =====
    
    function generateLabel() {
        const productName = document.getElementById('productName').value.trim();
        const origin = document.getElementById('origin').value.trim();
        const fdtInput = document.getElementById('fdt').value;
        const price = document.getElementById('price').value.trim();
        const kdv = document.querySelector('input[name="kdv"]:checked').value;
        const barcode = document.getElementById('barcode').value.trim();
        const quantity = parseInt(document.getElementById('quantity').value) || 1;

        // Validasyon
        if (!productName || !origin || !fdtInput || !price || !barcode) {
            showToast('Lütfen tüm alanları doldurun!', 'error');
            return;
        }

        // Tarihi formatla
        const dateParts = fdtInput.split('-');
        const formattedDate = `${parseInt(dateParts[2])}.${parseInt(dateParts[1])}.${dateParts[0]}`;

        // Canvas boyutları (30mm x 15mm, 300 DPI oranında)
        // 30mm ≈ 354px, 15mm ≈ 177px (300 DPI'da)
        // Ekranda daha iyi görünüm için 2x
        const SCALE = 3;
        const labelWidth = 354 * SCALE;
        const labelHeight = 177 * SCALE;
        
        canvas.width = labelWidth;
        canvas.height = labelHeight;

        // Arka plan
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, labelWidth, labelHeight);

        // Kenarlık (ince çizgi)
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, labelWidth - 1, labelHeight - 1);

        const padding = 18 * SCALE;
        let currentY = padding;

        // === ÜRÜN ADI ===
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const nameFontSize = 13 * SCALE;
        ctx.font = `bold ${nameFontSize}px Arial, sans-serif`;
        
        // Ürün adını satırlara böl
        const maxWidth = labelWidth - (padding * 2);
        const nameLines = wrapText(ctx, productName, maxWidth);
        
        for (let i = 0; i < Math.min(nameLines.length, 2); i++) {
            ctx.fillText(nameLines[i], padding, currentY);
            currentY += nameFontSize + 3 * SCALE;
        }
        
        currentY += 4 * SCALE;

        // === MENŞEİ ===
        const infoFontSize = 11 * SCALE;
        ctx.font = `${infoFontSize}px Arial, sans-serif`;
        ctx.fillText(`Menşei: ${origin}`, padding, currentY);
        currentY += infoFontSize + 4 * SCALE;

        // === F.D.T ===
        ctx.font = `${infoFontSize}px Arial, sans-serif`;
        ctx.fillText(`F.D.T: ${formattedDate}`, padding, currentY);
        currentY += infoFontSize + 6 * SCALE;

        // === FİYAT ===
        const priceFontSize = 20 * SCALE;
        ctx.font = `bold ${priceFontSize}px Arial, sans-serif`;
        ctx.fillText(`${price}`, padding, currentY);
        
        // TL yazısı
        const priceWidth = ctx.measureText(price).width;
        const tlFontSize = 14 * SCALE;
        ctx.font = `bold ${tlFontSize}px Arial, sans-serif`;
        ctx.fillText('TL', padding + priceWidth + 8 * SCALE, currentY + (priceFontSize - tlFontSize) / 2);

        // === KDV ===
        const kdvText = kdv === 'dahil' ? 'KDV DAHİL' : 'KDV HARİÇ';
        const kdvFontSize = 9 * SCALE;
        ctx.font = `bold ${kdvFontSize}px Arial, sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText(kdvText, labelWidth - padding, currentY + priceFontSize - kdvFontSize);

        // === BARKOD ===
        ctx.textAlign = 'left';
        const barcodeWidth = 200 * SCALE;
        const barcodeHeight = 45 * SCALE;
        const barcodeX = padding;
        const barcodeY = labelHeight - barcodeHeight - padding + 5 * SCALE;
        
        drawBarcode(ctx, barcodeX, barcodeY, barcodeWidth, barcodeHeight, barcode);

        // Göster
        placeholder.style.display = 'none';
        labelContainer.style.display = 'flex';
        printActions.style.display = 'flex';

        // Print area hazırla
        preparePrintArea(quantity);

        showToast(`Etiket başarıyla oluşturuldu! (${quantity} adet)`, 'success');
    }

    function wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    function preparePrintArea(quantity) {
        printArea.innerHTML = '';
        
        for (let i = 0; i < quantity; i++) {
            const wrapper = document.createElement('div');
            wrapper.className = 'print-label-wrapper';
            
            const printCanvas = document.createElement('canvas');
            printCanvas.width = canvas.width;
            printCanvas.height = canvas.height;
            
            const printCtx = printCanvas.getContext('2d');
            printCtx.drawImage(canvas, 0, 0);
            
            // Yazdırma boyutunu ayarla (mm cinsinden)
            printCanvas.style.width = '30mm';
            printCanvas.style.height = '15mm';
            
            wrapper.appendChild(printCanvas);
            printArea.appendChild(wrapper);
        }
    }

    // ===== TOAST BİLDİRİMİ =====
    function showToast(message, type = 'success') {
        // Önceki toast'ları temizle
        document.querySelectorAll('.toast').forEach(t => t.remove());
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' 
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
        
        toast.innerHTML = icon + message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ===== EVENT LISTENERS =====
    
    // Form submit
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        generateLabel();
    });

    // Temizle butonu
    clearBtn.addEventListener('click', function() {
        form.reset();
        document.getElementById('fdt').value = today;
        document.getElementById('quantity').value = 1;
        placeholder.style.display = 'flex';
        labelContainer.style.display = 'none';
        printActions.style.display = 'none';
        printArea.innerHTML = '';
        showToast('Form temizlendi', 'success');
    });

    // Yazdır butonu
    printBtn.addEventListener('click', function() {
        window.print();
    });

    // İndir butonu
    downloadBtn.addEventListener('click', function() {
        const link = document.createElement('a');
        const productName = document.getElementById('productName').value.trim() || 'etiket';
        link.download = `etiket_${productName.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Etiket görseli indirildi!', 'success');
    });

    // Fiyat input - sadece sayı ve nokta
    document.getElementById('price').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9.,]/g, '');
    });

    // Barkod input - sadece sayı
    document.getElementById('barcode').addEventListener('input', function(e) {
        this.value = this.value.replace(/\D/g, '').substring(0, 13);
    });
});
