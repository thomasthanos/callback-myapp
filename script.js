document.addEventListener('DOMContentLoaded', () => {
    // Supabase client
    const supabase = window.supabase.createClient(
        'https://codjpvcfsodohbsmmxap.supabase.co/',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGpwdmNmc29kb2hic21teGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNTgzOTksImV4cCI6MjA2MzgzNDM5OX0.6X2YcPwh0mbOkMC1UXDIlMorNOYNwi_i2VZQYUureX4'
    );
    window.supabaseClient = supabase;

    const DEFAULT_CATEGORIES = ['Email', 'Gaming', 'Social Media', 'Streaming', 'Development','Utilities'];

    // --- Dynamic Categories per User ---
    async function loadCategories() {
        const nav = document.getElementById('categoriesNav');
        // Καθαρίζει όλες εκτός από το addCategoryBtn
        Array.from(nav.querySelectorAll('.category-btn')).forEach(btn => {
            if (btn.id !== 'addCategoryBtn') btn.remove();
        });
        // Φόρτωσε custom categories από Supabase
        let categories = [...DEFAULT_CATEGORIES];
        if (currentUser) {
            const { data } = await supabase
                .from('user_categories')
                .select('category_name')
                .eq('user_id', currentUser.user_id);
            if (data && data.length > 0) {
                data.forEach(row => {
                    if (!categories.includes(row.category_name)) categories.push(row.category_name);
                });
            }
        }
        // Πρόσθεσε τα κουμπιά στο nav
categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-btn';
    btn.dataset.category = cat;
    btn.textContent = cat;
    btn.onclick = () => {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterButtons(cat);
    };
    nav.insertBefore(btn, document.getElementById('addCategoryBtn'));
});

        // Ενεργοποίησε το πρώτο
        setTimeout(() => {
            let first = nav.querySelector('.category-btn:not(#addCategoryBtn)');
            if (first) {
                first.classList.add('active');
                filterButtons(first.dataset.category);
            }
        }, 80);
    }

document.getElementById('addCategoryBtn').onclick = async function () {
    if (!currentUser) {
        alert("Πρέπει να είσαι συνδεδεμένος για να προσθέσεις κατηγορία!");
        return;
    }
    const name = (prompt("Όνομα νέας κατηγορίας:") || "").trim();
    if (!name) return;

        // Ελέγχει αν υπάρχει ήδη
        const exists = Array.from(document.querySelectorAll('.category-btn'))
            .some(btn => btn.dataset.category && btn.dataset.category.toLowerCase() === name.toLowerCase());
        if (exists) {
            alert('Υπάρχει ήδη αυτή η κατηγορία!');
            return;
        }
        // Αποθήκευση στο Supabase
        if (currentUser) {
            const { error } = await supabase
                .from('user_categories')
                .insert([{ user_id: currentUser.user_id, category_name: name }]);
            if (error) {
                alert('Σφάλμα κατά την αποθήκευση!');
                return;
            }
        }
        await loadCategories(); // Επαναφόρτωση όλων
    };

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

    // Imgur upload helper (όπως είχες)
    async function uploadToImgur(file, onSuccess, onError) {
        const clientId = "4707ced68436834";
        const formData = new FormData();
        formData.append("image", file);
        try {
            const res = await fetch("https://api.imgur.com/3/image", {
                method: "POST",
                headers: { Authorization: "Client-ID " + clientId },
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

    setupEditModalImageUpload();
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

    // Check session and register discord user
    (async function () {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
            window.currentUser = {
                user_id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata.full_name || session.user.user_metadata.name || "",
                image: session.user.user_metadata.avatar_url || "",
            };
            // Register Discord user if not exists
            (async function () {
                const { data } = await supabase
                    .from('discord_users')
                    .select('user_id')
                    .eq('user_id', currentUser.user_id);
                if (!data || data.length === 0) {
                    await supabase
                        .from('discord_users')
                        .insert([{
                            user_id: currentUser.user_id,
                            email: currentUser.email,
                            name: currentUser.name,
                            image: currentUser.image
                        }]);
                }
            })();
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateAuthUI();
            await loadCategories(); // --- HERE ---
            loadButtons();
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
        const profileContainer = document.getElementById('profileContainer');
        const profileName = document.getElementById('profileName');
        const profileAvatar = document.getElementById('profileAvatar');
        const discordBtn = document.getElementById('discord-login-btn');
        const searchBar = document.querySelector('.super-searchbar');
        const buttonContainer = document.getElementById('buttonContainer');

        if (currentUser) {
            if (profileContainer) {
                profileContainer.style.display = '';
                profileName.textContent = currentUser.name || 'User';
                profileAvatar.src = currentUser.image || 'https://via.placeholder.com/24';
            }
            if (discordBtn) discordBtn.style.display = 'none';
            if (searchBar) searchBar.style.display = '';
            if (buttonContainer) buttonContainer.style.display = '';
        } else {
            if (profileContainer) profileContainer.style.display = 'none';
            if (discordBtn) discordBtn.style.display = '';
            if (searchBar) searchBar.style.display = 'none';
            if (buttonContainer) buttonContainer.style.display = 'none';
        }

        // Setup dropdown toggle
        const profileInfo = document.querySelector('.profile-info');
        const dropdownMenu = document.getElementById('dropdownMenu');
        if (profileInfo && dropdownMenu) {
            profileInfo.addEventListener('click', () => {
                dropdownMenu.classList.toggle('active');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!profileInfo.contains(e.target) && !dropdownMenu.contains(e.target)) {
                    dropdownMenu.classList.remove('active');
                }
            });
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
console.log("Saving button_id:", button_id);

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
                image,
                category: activeCategory,
                can_add: true,
                can_read: true,
                discord_name: currentUser.name || ""
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
    function createButtonElement({ button_id, name, category, email, password, image, discord_name }) {
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
                </div>
            </div>
        `;
        // Add clipboard και toggle password events
        if (email) {
            const emailElement = buttonDiv.querySelector('.button-email');
            if (emailElement) {
                emailElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(email)
                        .then(() => showCopyNotification('Email copied to clipboard!'));
                });
            }
        }

        if (password) {
            const passwordElement = buttonDiv.querySelector('.button-password');
            const toggleBtn = buttonDiv.querySelector('.toggle-password');
            let isVisible = false;

            if (passwordElement && toggleBtn) {
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
        }

        buttonDiv.addEventListener('click', () => openEditModal(button_id));
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
    const categoryButtons = document.querySelectorAll('.category-btn:not(#addCategoryBtn)');
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
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

        // Check if input matches a category (case-insensitive)
        const allCategoryBtns = Array.from(document.querySelectorAll('.category-btn'));
        const foundCategoryBtn = allCategoryBtns.find(btn =>
            btn.dataset.category && btn.dataset.category.toLowerCase() === name.toLowerCase()
        );
        // Είναι custom αν δεν είναι default:
        const isCustomCategory = foundCategoryBtn &&
            !DEFAULT_CATEGORIES.includes(foundCategoryBtn.dataset.category);

        // Check για κουμπί (όπως πριν)
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
            deleteBtn.textContent = 'Διαγραφή'; // κουμπιού
        } else if (isCustomCategory) {
            addBtn.style.display = 'none';
            editBtn.style.display = 'none';
            deleteBtn.style.display = '';
            deleteBtn.textContent = 'Διαγραφή Κατηγορίας';
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

        // *** Ελέγχει αν είναι custom κατηγορία ***
        const allCategoryBtns = Array.from(document.querySelectorAll('.category-btn'));
        const foundCategoryBtn = allCategoryBtns.find(btn =>
            btn.dataset.category && btn.dataset.category.toLowerCase() === name.toLowerCase()
        );
        const isCustomCategory = foundCategoryBtn &&
            !DEFAULT_CATEGORIES.includes(foundCategoryBtn.dataset.category);

        if (isCustomCategory) {
            customConfirm(`Θέλεις να διαγράψεις ΟΛΗ την κατηγορία "${name}" και όλα τα κουμπιά της;`, async (ok) => {
                if (ok) {
                    // Delete all buttons of this category for the user
                    await supabase
                        .from('user_password')
                        .delete()
                        .eq('user_id', currentUser.user_id)
                        .eq('category', name);
                    // Delete the category
                    await supabase
                        .from('user_categories')
                        .delete()
                        .eq('user_id', currentUser.user_id)
                        .eq('category_name', name);
                    await loadCategories();
                    await loadButtons();
                    input.value = "";
                    showCopyNotification(`Η κατηγορία "${name}" διαγράφηκε!`);
                    await refreshButtons();
                }
            });
            return;
        }

        // *** Αλλιώς κάνει delete κουμπί όπως πριν ***
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

            // *** Αν είναι custom κατηγορία, σβήσε κατηγορία με enter ***
            const allCategoryBtns = Array.from(document.querySelectorAll('.category-btn'));
            const foundCategoryBtn = allCategoryBtns.find(btn =>
                btn.dataset.category && btn.dataset.category.toLowerCase() === name.toLowerCase()
            );
            const isCustomCategory = foundCategoryBtn &&
                !DEFAULT_CATEGORIES.includes(foundCategoryBtn.dataset.category);

            if (isCustomCategory) {
                deleteBtn.click();
                return;
            }

            // Αλλιώς συνέχισε ως τώρα (edit κουμπιού ή add νέο)
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

// Info Panel Functionality
document.getElementById('infoBtn').onclick = function(e) {
  e.stopPropagation();
  document.getElementById('infoSidePanel').classList.toggle('active');
};

document.getElementById('closeInfoPanel').onclick = function(e) {
  e.stopPropagation();
  document.getElementById('infoSidePanel').classList.remove('active');
};

// Close when clicking outside
document.addEventListener('click', function(e) {
  const infoPanel = document.getElementById('infoSidePanel');
  const isClickInsidePanel = infoPanel.contains(e.target);
  const isInfoButton = e.target === document.getElementById('infoBtn') || 
                      document.getElementById('infoBtn').contains(e.target);

  if (infoPanel.classList.contains('active') && !isClickInsidePanel && !isInfoButton) {
    infoPanel.classList.remove('active');
  }
});

// Close with Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && document.getElementById('infoSidePanel').classList.contains('active')) {
    document.getElementById('infoSidePanel').classList.remove('active');
  }
});

});