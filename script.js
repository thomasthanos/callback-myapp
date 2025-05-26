document.addEventListener('DOMContentLoaded', () => {
    loadButtons();
    setupCategoryFilters();
    setupSuperSearchbar();

    document.getElementById('save-edit-button').onclick = saveEdit;
    document.getElementById('cancel-edit-button').onclick = closeModal;

    document.getElementById('export-btn').onclick = exportButtons;
    document.getElementById('import-btn').onclick = () => document.getElementById('import-file').click();
    document.getElementById('import-file').onchange = importButtons;

    setupEditModalImgurUpload();

    if (!document.getElementById('notify-container')) {
        const notifyContainer = document.createElement('div');
        notifyContainer.id = 'notify-container';
        document.body.appendChild(notifyContainer);
    }
});

function setupEditModalImgurUpload() {
    const IMGUR_CLIENT_ID = '4707ced68436834';
    const input = document.getElementById('imageUploadInput');
    const status = document.getElementById('imageUploadStatus');
    const urlInput = document.getElementById('editImage');
    const imgPreviewDiv = document.getElementById('imagePreview');
    const removeBtn = document.getElementById('removeImageBtn');
    const uploadTrigger = document.getElementById('uploadTrigger');

    if (!input || !uploadTrigger || !status || !urlInput || !imgPreviewDiv || !removeBtn) {
        console.error('Missing elements:', {
            input: !!input,
            uploadTrigger: !!uploadTrigger,
            status: !!status,
            urlInput: !!urlInput,
            imgPreviewDiv: !!imgPreviewDiv,
            removeBtn: !!removeBtn
        });
        showCopyNotification('Σφάλμα: Δεν βρέθηκαν όλα τα στοιχεία για το upload!');
        return;
    }

    input.style.display = 'none';

    uploadTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Upload trigger clicked');
        input.click();
    });

    input.addEventListener('change', function() {
        const file = this.files[0];
        if (!file) {
            console.log('No file selected');
            return;
        }
        
        removeBtn.style.display = '';
        const reader = new FileReader();
        reader.onload = function(e) {
            imgPreviewDiv.style.backgroundImage = `url(${e.target.result})`;
            imgPreviewDiv.style.display = 'block';
        };
        reader.readAsDataURL(file);

        if (!file.type.startsWith('image/')) {
            status.textContent = 'Μόνο εικόνες!';
            console.log('Invalid file type:', file.type);
            return;
        }
        status.textContent = 'Uploading...';

        const formData = new FormData();
        formData.append('image', file);

        fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: {
                Authorization: 'Client-ID ' + IMGUR_CLIENT_ID
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                urlInput.value = data.data.link;
                status.textContent = 'Έτοιμο!';
                console.log('Upload successful:', data.data.link);
            } else {
                status.textContent = 'Αποτυχία!';
                console.error('Upload failed:', data);
            }
        })
        .catch(error => {
            status.textContent = 'Σφάλμα!';
            console.error('Upload error:', error);
        });
    });

    removeBtn.addEventListener('click', function() {
        input.value = "";
        imgPreviewDiv.style.backgroundImage = "";
        imgPreviewDiv.style.display = "none";
        urlInput.value = "";
        status.textContent = "";
        removeBtn.style.display = "none";
        console.log('Image removed');
    });
}

function customConfirm(message, callback) {
    const modal = document.getElementById('confirmModal');
    const msgElem = document.getElementById('confirmModalMsg');
    const okBtn = document.getElementById('confirmModalOk');
    const cancelBtn = document.getElementById('confirmModalCancel');

    msgElem.textContent = message;
    modal.style.display = 'flex';

    function cleanup(result) {
        modal.style.display = 'none';
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        document.removeEventListener('keydown', onKeyDown);
        callback(result);
    }
    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }
    function onKeyDown(e) {
        if (e.key === "Enter") onOk();
        if (e.key === "Escape") onCancel();
    }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKeyDown);
}

function setupSuperSearchbar() {
    const input = document.getElementById('searchInput');
    const addBtn = document.getElementById('mainActionBtn');
    const editBtn = document.getElementById('editBtn');
    const deleteBtn = document.getElementById('deleteBtn');

    function refreshButtons() {
        const name = input.value.trim();
        const buttons = JSON.parse(localStorage.getItem('buttons') || '[]');
        const exists = buttons.find(b => b.name.toLowerCase() === name.toLowerCase());
        if (name === "") {
            addBtn.style.display = '';
            addBtn.textContent = '➕ Προσθήκη';
            editBtn.style.display = 'none';
            deleteBtn.style.display = 'none';
        } else if (exists) {
            addBtn.style.display = 'none';
            editBtn.style.display = '';
            deleteBtn.style.display = '';
        } else {
            addBtn.style.display = '';
            addBtn.textContent = '➕ Προσθήκη';
            editBtn.style.display = 'none';
            deleteBtn.style.display = 'none';
        }
    }

    input.addEventListener('input', refreshButtons);

addBtn.onclick = () => {
    const name = input.value.trim();
    if (name === "") {
        showCopyNotification('Παρακαλώ εισάγετε όνομα κουμπιού!');
        return;
    }
    const buttonData = { id: generateUUID(), name, category: "Email", email: '', password: '' };
    const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'Email';
    saveButton(buttonData, activeCategory); // Περνάει την ενεργή κατηγορία
    filterButtons(activeCategory); // Ενημερώνει την τρέχουσα κατηγορία
    showCopyNotification('Το κουμπί προστέθηκε!');
    input.value = "";
    refreshButtons();
};

    editBtn.onclick = () => {
        const name = input.value.trim();
        const buttons = JSON.parse(localStorage.getItem('buttons') || '[]');
        const btn = buttons.find(b => b.name.toLowerCase() === name.toLowerCase());
        if (!btn) {
            showCopyNotification('Δεν βρέθηκε κουμπί για edit');
            return;
        }
        openEditModal(btn.id);
    };

    deleteBtn.onclick = () => {
        const name = input.value.trim();
        const buttons = JSON.parse(localStorage.getItem('buttons') || '[]');
        const btn = buttons.find(b => b.name.toLowerCase() === name.toLowerCase());
        if (!btn) {
            showCopyNotification('Δεν βρέθηκε κουμπί για διαγραφή');
            return;
        }
        customConfirm(`Θέλεις να διαγράψεις το κουμπί "${btn.name}" ;`, (ok) => {
            if (ok) {
                removeButton(btn.id);
                showCopyNotification('Το κουμπί διαγράφηκε!');
                input.value = "";
                refreshButtons();
            }
        });
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === "Enter") {
            const name = input.value.trim();
            const buttons = JSON.parse(localStorage.getItem('buttons') || '[]');
            const exists = buttons.find(b => b.name.toLowerCase() === name.toLowerCase());
            if (exists) {
                openEditModal(exists.id);
            } else {
                addBtn.click();
            }
        }
    });

    refreshButtons();
}

function askPasswordModal(title, callback) {
    const modal = document.getElementById('passwordModal');
    const input = document.getElementById('passwordModalInput');
    const okBtn = document.getElementById('passwordModalOk');
    const cancelBtn = document.getElementById('passwordModalCancel');
    const titleElem = document.getElementById('passwordModalTitle');

    titleElem.textContent = title || "Password";
    input.value = '';
    modal.style.display = 'flex';
    setTimeout(() => input.focus(), 80);

    function cleanup(result) {
        modal.style.display = 'none';
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        input.removeEventListener('keydown', onKeyDown);
        callback(result);
    }
    function onOk() { cleanup(input.value); }
    function onCancel() { cleanup(null); }
    function onKeyDown(e) {
        if (e.key === "Enter") onOk();
        if (e.key === "Escape") onCancel();
    }
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    input.addEventListener('keydown', onKeyDown);
}

// ---- ENCRYPTED EXPORT ----
function exportButtons() {
    const buttons = JSON.parse(localStorage.getItem('buttons') || '[]');
    if (buttons.length === 0) {
        showCopyNotification('Δεν υπάρχουν κουμπιά για export!');
        return;
    }
    askPasswordModal('Βάλε password για κρυπτογράφηση του export:', function (password) {
        if (!password) return;
        const data = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            buttons: buttons
        };
        const jsonStr = JSON.stringify(data);
        const encrypted = CryptoJS.AES.encrypt(jsonStr, password).toString();

        const blob = new Blob([encrypted], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `buttons-export-${new Date().toISOString().slice(0, 10)}.enc.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showCopyNotification('Το αρχείο εξήχθη με επιτυχία!');
    });
}

// ---- ENCRYPTED IMPORT ----
function importButtons(event) {
    const file = event.target.files[0];
    if (!file) return;
    askPasswordModal('Βάλε password για αποκρυπτογράφηση:', function (password) {
        if (!password) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const encrypted = e.target.result;
                const decrypted = CryptoJS.AES.decrypt(encrypted, password);
                const jsonStr = decrypted.toString(CryptoJS.enc.Utf8);
                if (!jsonStr) throw new Error('Λάθος password ή κατεστραμμένο αρχείο!');
                const data = JSON.parse(jsonStr);

                if (!data.buttons || !Array.isArray(data.buttons)) {
                    throw new Error('Μη έγκυρη μορφή αρχείου');
                }
                if (confirm(`Θέλετε να εισαγάγετε ${data.buttons.length} κουμπιά; Αυτό θα αντικαταστήσει τα τρέχοντα δεδομένα.`)) {
                    localStorage.setItem('buttons', JSON.stringify(data.buttons));
                    const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'Email';
                    filterButtons(activeCategory);
                    showCopyNotification('Επιτυχής εισαγωγή!');
                }
            } catch (error) {
                showCopyNotification(`Σφάλμα κατά την εισαγωγή: ${error.message}`);
            }
            event.target.value = ''; // Reset το input file
        };
        reader.readAsText(file);
    });
}

// ---- Υπόλοιπες λειτουργίες ----

function setupCategoryFilters() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filterButtons(button.dataset.category);
        });
    });
}

function generateUUID() {
    return 'btn-' + ([1e7] + -1e3 + -4e3 + -8e3 + -1e11)
        .replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
}

function createButtonElement({ id, name, category, email, password, image }) {
    const container = document.getElementById('buttonContainer');
    if (!container) return;
    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'dynamic-button';
    buttonDiv.dataset.category = category;
    buttonDiv.id = id;

    buttonDiv.innerHTML = `
        <div class="button-title">
            ${image ? `<img src="${image}" class="button-img" style="width:30px;height:30px;object-fit:cover;border-radius:7px;margin-right:10px;vertical-align:middle;">` : ''}
            ${name}
        </div>
        <div class="button-main">
            <div class="button-info">
                ${email ? `<span class="button-email" data-email="${email}">✉️ ${email}</span>` : ""}
                ${password ? `
                <div class="password-container">
                    <span class="button-password" data-password="${password}">🔑 ••••••••</span>
                    <span class="toggle-password">👁️</span>
                </div>
                ` : ""}
            </div>
        </div>
    `;
    if (email) {
        const emailElement = buttonDiv.querySelector('.button-email');
        emailElement.addEventListener('click', () => {
            navigator.clipboard.writeText(email)
                .then(() => {
                    showCopyNotification('Email copied to clipboard!');
                });
        });
    }

    if (password) {
        const passwordElement = buttonDiv.querySelector('.button-password');
        const toggleBtn = buttonDiv.querySelector('.toggle-password');
        let isVisible = false;

        passwordElement.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(password)
                .then(() => {
                    showCopyNotification('Password copied to clipboard!');
                });
        });

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isVisible = !isVisible;
            passwordElement.textContent = isVisible ? `🔑 ${password}` : '🔑 ••••••••';
            toggleBtn.textContent = isVisible ? '👁️‍🗨️' : '👁️';
        });
    }

    container.appendChild(buttonDiv);
}

function openEditModal(id) {
    const modal = document.getElementById('editModal');
    let buttons = JSON.parse(localStorage.getItem('buttons') || '[]');
    const btn = buttons.find(b => b.id === id);
    if (!btn) return;

    document.getElementById('editButtonName').value = btn.name;
    document.getElementById('editEmail').value = btn.email || '';
    document.getElementById('editPassword').value = btn.password || '';
    document.getElementById('editImage').value = btn.image || '';
    modal.dataset.id = id;
    modal.style.display = 'flex';
}

function saveEdit() {
    const modal = document.getElementById('editModal');
    const id = modal.dataset.id;
    const name = document.getElementById('editButtonName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const password = document.getElementById('editPassword').value.trim();
    const image = document.getElementById('editImage').value.trim();

    if (name === '') {
        showCopyNotification('Το όνομα κουμπιού δεν μπορεί να είναι κενό!');
        return;
    }

    let buttons = JSON.parse(localStorage.getItem('buttons') || '[]');
    buttons = buttons.map(button =>
        button.id === id ? { ...button, name, email, password, image } : button
    );
    localStorage.setItem('buttons', JSON.stringify(buttons));

    const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'Email';
    filterButtons(activeCategory);
    closeModal();

    showCopyNotification('Οι αλλαγές αποθηκεύτηκαν!');
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
    const input = document.getElementById('imageUploadInput');
    if (input) {
        input.value = ""; // Καθαρίζει την επιλογή του αρχείου
        const imgPreviewDiv = document.getElementById('imagePreview');
        const removeBtn = document.getElementById('removeImageBtn');
        const urlInput = document.getElementById('editImage');
        const status = document.getElementById('imageUploadStatus');
        if (imgPreviewDiv) imgPreviewDiv.style.backgroundImage = "";
        if (imgPreviewDiv) imgPreviewDiv.style.display = "none";
        if (removeBtn) removeBtn.style.display = "none";
        if (urlInput) urlInput.value = "";
        if (status) status.textContent = "";
    }
}

function removeButton(id) {
    let buttons = JSON.parse(localStorage.getItem('buttons') || '[]');
    buttons = buttons.filter(button => button.id !== id);
    localStorage.setItem('buttons', JSON.stringify(buttons));

    const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'Email';
    filterButtons(activeCategory);
}

function saveButton(buttonData, category) {
    const buttons = JSON.parse(localStorage.getItem('buttons') || '[]');
    buttonData.category = category; // Χρησιμοποιεί την τρέχουσα κατηγορία
    buttons.push(buttonData);
    localStorage.setItem('buttons', JSON.stringify(buttons));
}

function loadButtons() {
    const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'Email';
    filterButtons(activeCategory);
}

function filterButtons(category) {
    const container = document.getElementById('buttonContainer');
    if (!container) return;
    container.innerHTML = '';
    const buttons = JSON.parse(localStorage.getItem('buttons') || '[]');
    buttons.filter(b => b.category === category).forEach(createButtonElement);
    document.querySelectorAll('.category-btn').forEach(btn => {
        if (btn.dataset.category === category) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

// -- STACKING NOTIFY FUNCTION --
function showCopyNotification(msg) {
    let container = document.getElementById('notify-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notify-container';
        document.body.appendChild(container);
    }

    let notif = document.createElement('div');
    notif.className = 'copy-notification';
    notif.innerText = msg;
    container.appendChild(notif);

    setTimeout(() => {
        notif.remove();
    }, 2000);
}

function updateFooterInfo() {
    const footerDiv = document.getElementById('footer-info');
    if (!footerDiv) return;

    const now = new Date();
    const weekdays = [
        'Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη',
        'Πέμπτη', 'Παρασκευή', 'Σάββατο'
    ];
    const months = [
        'Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου',
        'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου'
    ];

    const weekday = weekdays[now.getDay()];
    const day = now.getDate().toString().padStart(2, '0');
    const month = months[now.getMonth()];
    const year = now.getFullYear();

    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    footerDiv.textContent = `Password Manager — © ThomasT | ${weekday}, ${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
}
updateFooterInfo();
setInterval(updateFooterInfo, 1000);