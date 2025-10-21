document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.querySelector(".nav__toggle");
  const navMenu = document.querySelector(".nav__menu");

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const counterElements = document.querySelectorAll(".stat__value");

  const animateCounter = (entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = Number(el.dataset.target) || 0;
    const duration = 1600;
    const start = performance.now();

    const update = (timestamp) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      const value = Math.floor(progress * target);
      el.textContent = value.toLocaleString("vi-VN");

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
    observer.unobserve(el);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(animateCounter);
  }, {
    threshold: 0.4,
  });

  counterElements.forEach((el) => {
    observer.observe(el);
  });

  const currentYear = document.getElementById("current-year");
  if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
  }

  const uploadForm = document.querySelector(".upload__form");
  const fileInput = document.getElementById("dataset-upload");
  const statusEl = document.querySelector(".upload__status");
  const summary = document.querySelector(".upload__summary");
  const metrics = summary
    ? {
        rows: summary.querySelector('[data-metric="rows"]'),
        columns: summary.querySelector('[data-metric="columns"]'),
        size: summary.querySelector('[data-metric="size"]'),
      }
    : null;
  const preview = summary?.querySelector(".upload__preview");
  const previewHead = preview?.querySelector("thead");
  const previewBody = preview?.querySelector("tbody");

  const setStatus = (message, variant = "info") => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove("upload__status--error", "upload__status--success");

    if (variant === "error") {
      statusEl.classList.add("upload__status--error");
    } else if (variant === "success") {
      statusEl.classList.add("upload__status--success");
    }
  };

  const resetPreview = () => {
    if (summary) {
      summary.hidden = true;
    }
    if (preview) {
      preview.hidden = true;
    }
    if (previewHead) {
      previewHead.innerHTML = "";
    }
    if (previewBody) {
      previewBody.innerHTML = "";
    }
    if (metrics) {
      metrics.rows.textContent = "0";
      metrics.columns.textContent = "0";
      metrics.size.textContent = "0 KB";
    }
  };

  const formatFileSize = (bytes) => {
    if (!Number.isFinite(bytes)) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const parseCsvLine = (line) => {
    const cells = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    cells.push(current.trim());
    return cells;
  };

  const populatePreview = (header, rows) => {
    if (!summary || !preview || !previewHead || !previewBody || !metrics) return;

    const columnCount = header.length || Math.max(0, ...rows.map((r) => r.length));
    const safeHeader = columnCount
      ? header.length
        ? header
        : Array.from({ length: columnCount }, (_, index) => `Trường ${index + 1}`)
      : [];

    if (safeHeader.length) {
      const headerRow = document.createElement("tr");
      safeHeader.forEach((title) => {
        const th = document.createElement("th");
        th.textContent = title || "-";
        headerRow.appendChild(th);
      });
      previewHead.replaceChildren(headerRow);
    } else {
      previewHead.innerHTML = "";
    }

    previewBody.innerHTML = "";
    rows.slice(0, 5).forEach((row) => {
      const tr = document.createElement("tr");
      const cells = columnCount ? row.slice(0, columnCount) : row;
      const filled = columnCount
        ? [...cells, ...Array(Math.max(columnCount - cells.length, 0)).fill("")]
        : cells;

      filled.forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value ?? "";
        tr.appendChild(td);
      });
      previewBody.appendChild(tr);
    });

    const totalRows = rows.length;
    const totalColumns = columnCount;

    metrics.rows.textContent = totalRows.toLocaleString("vi-VN");
    metrics.columns.textContent = totalColumns.toLocaleString("vi-VN");
  };

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) {
        setStatus(`Đã chọn tập tin: ${fileInput.files[0].name}`);
      } else {
        setStatus("Chưa có tập tin nào được tải lên.");
      }
      resetPreview();
    });
  }

  if (uploadForm) {
    uploadForm.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        setStatus("Vui lòng chọn tập dữ liệu trước khi phân tích.", "error");
        resetPreview();
        return;
      }

      const file = fileInput.files[0];
      const maxBytes = 5 * 1024 * 1024;

      if (file.size > maxBytes) {
        setStatus("Tập tin vượt quá giới hạn 5MB, vui lòng chọn tập nhỏ hơn.", "error");
        resetPreview();
        return;
      }

      const reader = new FileReader();

      setStatus("Đang xử lý dữ liệu, vui lòng chờ...");

      reader.onerror = () => {
        setStatus("Không thể đọc tập tin, vui lòng thử lại.", "error");
        resetPreview();
      };

      reader.onload = () => {
        try {
          const content = String(reader.result || "");
          const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
          const lines = normalized
            .split("\n")
            .filter((line) => line.trim().length > 0);

          if (!lines.length) {
            setStatus("Tập tin không chứa dữ liệu để phân tích.", "error");
            resetPreview();
            return;
          }

          const parsedRows = lines.map(parseCsvLine);
          const header = parsedRows.shift() || [];
          const dataRows = parsedRows;

          if (!dataRows.length) {
            setStatus("Tập tin chỉ có dòng tiêu đề, vui lòng bổ sung dữ liệu.", "error");
            resetPreview();
            return;
          }

          populatePreview(header, dataRows);

          if (summary && metrics) {
            summary.hidden = false;
            metrics.size.textContent = formatFileSize(file.size);
          }

          if (preview) {
            preview.hidden = false;
          }

          setStatus("Phân tích hoàn tất! Bạn có thể tiếp tục quy trình.", "success");
        } catch (error) {
          console.error(error);
          setStatus("Đã xảy ra lỗi khi xử lý dữ liệu, vui lòng kiểm tra lại định dạng.", "error");
          resetPreview();
        }
      };

      reader.readAsText(file, "UTF-8");
    });
  }
});
