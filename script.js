document.addEventListener('DOMContentLoaded', () => {
    // Supabase client
    const supabase = window.supabase.createClient(
        'https://codjpvcfsodohbsmmxap.supabase.co/',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGpwdmNmc29kb2hic21teGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNTgzOTksImV4cCI6MjA2MzgzNDM5OX0.6X2YcPwh0mbOkMC1UXDIlMorNOYNwi_i2VZQYUureX4'
    );

    let currentUser = null;

    // Discord Login Button Event
    document.getElementById('discord-login-btn').onclick = async function () {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: {
                redirectTo: window.location.href
            }
        });
        if (error) {
            showCopyNotification('Σφάλμα Discord login: ' + error.message);
        }
    };

    // Logout Event
    document.getElementById('logout-btn').onclick = handleLogout;

    // Imgur upload helper
    async function uploadToImgur(file, onSuccess, onError) {
        const clientId = "4707ced68436834";
        const formData = new FormData();
        formData.append("image", file);

        try {
            const res = await fetch("https://api.imgur.com/3/image", {
                method: "POST",
                headers: {
                    Authorization: "Client-ID " + clientId,
                },
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                onSuccess(data.data.link);
            } else {
                onError(data.data.error || "Imgur upload failed");
            }
        } catch (e) {
            onError(e.message || "Network error");
        }
    }

    // Setup modal image upload for add/edit
    setupEditModalImageUpload();

    // Image upload modal setup (unified for add/edit)
    function setupEditModalImageUpload() {
        const input = document.getElementById('imageUploadInput');
        const status = document.getElementById('imageUploadStatus');
        const urlInput = document.getElementById('editImage');
        const imgPreviewDiv = document.getElementById('imagePreview');
        const removeBtn = document.getElementById('removeImageBtn');
        const uploadTrigger = document.getElementById('uploadTrigger');

        if (!input || !uploadTrigger || !status || !urlInput || !imgPreviewDiv || !removeBtn) return;

        input.style.display = 'none';

        uploadTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            input.click();
        });

        input.addEventListener('change', async function () {
            const file = this.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                status.textContent = 'Μόνο εικόνες!';
                return;
            }
            status.textContent = "Uploading...";
            uploadToImgur(file, function (link) {
                urlInput.value = link;
                status.textContent = "Έτοιμο!";
                imgPreviewDiv.style.backgroundImage = `url(${link})`;
                imgPreviewDiv.style.display = 'block';
                removeBtn.style.display = '';
            }, function (errorMsg) {
                status.textContent = "Αποτυχία!";
                alert("Imgur upload error: " + errorMsg);
            });
        });

        removeBtn.addEventListener('click', function () {
            input.value = "";
            imgPreviewDiv.style.backgroundImage = "";
            imgPreviewDiv.style.display = "none";
            urlInput.value = "";
            status.textContent = "";
            removeBtn.style.display = "none";
        });
    }

    // --- Session Management (Discord) ---
    (async function () {
        // Check if session exists
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
            currentUser = {
                user_id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata.full_name || session.user.user_metadata.name || "",
                image: session.user.user_metadata.avatar_url || "",
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateAuthUI();
            loadButtons();
            setupCategoryFilters();
            setupSuperSearchbar();
        } else {
            localStorage.removeItem('currentUser');
            currentUser = null;
            updateAuthUI();
        }
    })();

    // Logout
    async function handleLogout() {
        currentUser = null;
        localStorage.removeItem('currentUser');
        await supabase.auth.signOut();
        document.getElementById('buttonContainer').innerHTML = '';
        updateAuthUI();
        showCopyNotification('Αποσύνδεση επιτυχής!');
    }

    // --- UI State for Auth ---
    function updateAuthUI() {
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const exportBtn = document.getElementById('export-btn');
        const importBtn = document.getElementById('import-btn');
        const searchBar = document.querySelector('.super-searchbar');
        const buttonContainer = document.getElementById('buttonContainer');
        const discordBtn = document.getElementById('discord-login-btn');

        if (currentUser) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (discordBtn) discordBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = '';
            if (exportBtn) exportBtn.style.display = '';
            if (importBtn) importBtn.style.display = '';
            if (searchBar) searchBar.style.display = '';
            if (buttonContainer) buttonContainer.style.display = '';
        } else {
            if (loginBtn) loginBtn.style.display = 'none';
            if (discordBtn) discordBtn.style.display = '';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (exportBtn) exportBtn.style.display = 'none';
            if (importBtn) importBtn.style.display = 'none';
            if (searchBar) searchBar.style.display = 'none';
            if (buttonContainer) buttonContainer.style.display = 'none';
        }
    }

    // --- Notifications ---
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

    // --- Add/Edit Modal logic ---
    document.getElementById('save-edit-button').onclick = saveEdit;
    document.getElementById('cancel-edit-button').onclick = closeModal;

    // "+" Προσθήκη: ανοίγει modal για νέο κουμπί
    document.getElementById('mainActionBtn').onclick = () => {
        document.getElementById('editButtonName').value = document.getElementById('searchInput').value || "";
        document.getElementById('editEmail').value = "";
        document.getElementById('editPassword').value = "";
        document.getElementById('editImage').value = "";
        document.getElementById('editModal').dataset.id = "";
        document.getElementById('editModal').style.display = 'flex';
        setTimeout(() => document.getElementById('editButtonName').focus(), 80);
    };

    // Save/Update κουμπιού (add ή edit)
    async function saveEdit() {
        const modal = document.getElementById('editModal');
        const button_id = modal.dataset.id;
        const name = document.getElementById('editButtonName').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        const password = document.getElementById('editPassword').value.trim();
        const image = document.getElementById('editImage').value.trim();
        const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'Others';

        if (!name) {
            showCopyNotification('Το όνομα κουμπιού δεν μπορεί να είναι κενό!');
            return;
        }

        if (!button_id) {
            // Νέο κουμπί
            const { data: buttons } = await supabase
                .from('user_password')
                .select('name')
                .eq('user_id', currentUser.user_id)
                .eq('category', activeCategory);
            if (buttons && buttons.find(b => b.name.toLowerCase() === name.toLowerCase())) {
                showCopyNotification('Υπάρχει ήδη κουμπί με αυτό το όνομα στην κατηγορία!');
                return;
            }
            const buttonData = {
                user_id: currentUser.user_id,
                email,
                password,
                name,
                category: activeCategory,
                image,
                link: "",
                can_add: true,
                can_read: true
            };
            const { error } = await supabase
                .from('user_password')
                .insert([buttonData]);
            if (error) {
                showCopyNotification(`Σφάλμα αποθήκευσης: ${error.message}`);
                return;
            }
            showCopyNotification('Το κουμπί προστέθηκε!');
        } else {
            // Ενημέρωση υπάρχοντος
            const { error } = await supabase
                .from('user_password')
                .update({ name, email, password, image })
                .eq('button_id', button_id);
            if (error) {
                showCopyNotification(`Σφάλμα αποθήκευσης: ${error.message}`);
                return;
            }
            showCopyNotification('Οι αλλαγές αποθηκεύτηκαν!');
        }

        filterButtons(activeCategory);
        closeModal();
    }

    function closeModal() {
        document.getElementById('editModal').style.display = 'none';
        const input = document.getElementById('imageUploadInput');
        if (input) {
            input.value = "";
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

    // --- Buttons CRUD ---
    async function removeButton(button_id) {
        const { error } = await supabase
            .from('user_password')
            .delete()
            .eq('button_id', button_id);
        if (error) {
            showCopyNotification(`Σφάλμα διαγραφής: ${error.message}`);
            return;
        }
        const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'Others';
        filterButtons(activeCategory);
    }

    async function saveButton(buttonData) {
        const { error } = await supabase
            .from('user_password')
            .insert([buttonData]);
        if (error) {
            showCopyNotification(`Σφάλμα αποθήκευσης: ${error.message}`);
            return;
        }
    }

    async function loadButtons() {
        const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'Others';
        filterButtons(activeCategory);
    }

    async function filterButtons(category) {
        const container = document.getElementById('buttonContainer');
        if (!container) return;
        container.innerHTML = '';
        const { data: buttons } = await supabase
            .from('user_password')
            .select('*')
            .eq('user_id', currentUser.user_id)
            .eq('category', category);

        if (buttons) buttons.forEach(createButtonElement);

        document.querySelectorAll('.category-btn').forEach(btn => {
            if (btn.dataset.category === category) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }

    // --- Dynamic Button UI ---
    function createButtonElement({ button_id, name, category, email, password, image, link }) {
        const container = document.getElementById('buttonContainer');
        if (!container) return;
        const buttonDiv = document.createElement('div');
        buttonDiv.className = 'dynamic-button';
        buttonDiv.dataset.category = category;
        buttonDiv.id = button_id;
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
                    ${link ? `<a href="${link}" target="_blank" class="button-link">🔗 Link</a>` : ""}
                </div>
            </div>
        `;
        // Edit on click
        buttonDiv.addEventListener('click', () => openEditModal(button_id));

        if (email) {
            const emailElement = buttonDiv.querySelector('.button-email');
            emailElement.addEventListener('click', (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(email)
                    .then(() => showCopyNotification('Email copied to clipboard!'));
            });
        }
        if (password) {
            const passwordElement = buttonDiv.querySelector('.button-password');
            const toggleBtn = buttonDiv.querySelector('.toggle-password');
            let isVisible = false;

            passwordElement.addEventListener('click', (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(password)
                    .then(() => showCopyNotification('Password copied to clipboard!'));
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

    async function openEditModal(button_id) {
        const modal = document.getElementById('editModal');
        const { data: userData } = await supabase
            .from('user_password')
            .select('*')
            .eq('button_id', button_id)
            .single();

        if (!userData) return;

        document.getElementById('editButtonName').value = userData.name;
        document.getElementById('editEmail').value = userData.email || '';
        document.getElementById('editPassword').value = userData.password || '';
        document.getElementById('editImage').value = userData.image || '';
        modal.dataset.id = button_id;
        modal.style.display = 'flex';
    }

    // --- Category filters ---
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

    // --- Super Searchbar: Add/Edit/Delete quick actions ---
    async function setupSuperSearchbar() {
        const input = document.getElementById('searchInput');
        const addBtn = document.getElementById('mainActionBtn');
        const editBtn = document.getElementById('editBtn');
        const deleteBtn = document.getElementById('deleteBtn');

        async function refreshButtons() {
            const name = input.value.trim();
            const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'Others';
            const { data: buttons } = await supabase
                .from('user_password')
                .select('*')
                .eq('user_id', currentUser.user_id)
                .eq('category', activeCategory);

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

        editBtn.onclick = async () => {
            const name = input.value.trim();
            const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'Others';
            const { data: buttons } = await supabase
                .from('user_password')
                .select('*')
                .eq('user_id', currentUser.user_id)
                .eq('category', activeCategory);

            const btn = buttons.find(b => b.name.toLowerCase() === name.toLowerCase());
            if (!btn) {
                showCopyNotification('Δεν βρέθηκε κουμπί για edit');
                return;
            }
            openEditModal(btn.button_id);
        };

        deleteBtn.onclick = async () => {
            const name = input.value.trim();
            const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'Others';
            const { data: buttons } = await supabase
                .from('user_password')
                .select('*')
                .eq('user_id', currentUser.user_id)
                .eq('category', activeCategory);

            const btn = buttons.find(b => b.name.toLowerCase() === name.toLowerCase());
            if (!btn) {
                showCopyNotification('Δεν βρέθηκε κουμπί για διαγραφή');
                return;
            }
            customConfirm(`Θέλεις να διαγράψεις το κουμπί "${btn.name}" ;`, async (ok) => {
                if (ok) {
                    await removeButton(btn.button_id);
                    showCopyNotification('Το κουμπί διαγράφηκε!');
                    input.value = "";
                    await refreshButtons();
                }
            });
        };

        input.addEventListener('keydown', async (e) => {
            if (e.key === "Enter") {
                const name = input.value.trim();
                const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'Others';
                const { data: buttons } = await supabase
                    .from('user_password')
                    .select('*')
                    .eq('user_id', currentUser.user_id)
                    .eq('category', activeCategory);

                const exists = buttons.find(b => b.name.toLowerCase() === name.toLowerCase());
                if (exists) {
                    openEditModal(exists.button_id);
                } else {
                    addBtn.click();
                }
            }
        });

        await refreshButtons();
    }

    // --- Custom Confirm Modal ---
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

    // --- Export / Import (crypto password-protected) ---
    document.getElementById('export-btn').onclick = exportButtons;
    document.getElementById('import-btn').onclick = () => document.getElementById('import-file').click();
    document.getElementById('import-file').onchange = importButtons;

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

    async function exportButtons() {
        const { data: buttons } = await supabase
            .from('user_password')
            .select('*')
            .eq('user_id', currentUser.user_id);

        if (!buttons || buttons.length === 0) {
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

    async function importButtons(event) {
        const file = event.target.files[0];
        if (!file) {
            showCopyNotification('Δεν επιλέχθηκε αρχείο!');
            return;
        }

        askPasswordModal('Βάλε password για αποκρυπτογράφηση:', async function (password) {
            if (!password) {
                showCopyNotification('Δεν δόθηκε κωδικός αποκρυπτογράφησης!');
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const encrypted = e.target.result;
                    const decrypted = CryptoJS.AES.decrypt(encrypted, password);
                    const jsonStr = decrypted.toString(CryptoJS.enc.Utf8);
                    if (!jsonStr) {
                        throw new Error('Λάθος password ή κατεστραμμένο αρχείο!');
                    }

                    const data = JSON.parse(jsonStr);
                    if (!data.buttons || !Array.isArray(data.buttons)) {
                        throw new Error('Μη έγκυρη μορφή αρχείου');
                    }

                    if (confirm(`Θέλετε να εισαγάγετε ${data.buttons.length} κουμπιά; Αυτό θα αντικαταστήσει τα τρέχοντα δεδομένα.`)) {
                        await supabase
                            .from('user_password')
                            .delete()
                            .eq('user_id', currentUser.user_id);

                        for (const btn of data.buttons) {
                            btn.user_id = currentUser.user_id;
                            delete btn.button_id;
                            await supabase
                                .from('user_password')
                                .insert([btn]);
                        }
                        const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'Email';
                        filterButtons(activeCategory);
                        showCopyNotification('Επιτυχής εισαγωγή!');
                    }
                } catch (error) {
                    showCopyNotification(`Σφάλμα κατά την εισαγωγή: ${error.message}`);
                }
                event.target.value = '';
            };
            reader.onerror = (e) => {
                showCopyNotification('Σφάλμα ανάγνωσης αρχείου!');
            };
            reader.readAsText(file);
        });
    }

    // --- Footer Clock ---
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

});
