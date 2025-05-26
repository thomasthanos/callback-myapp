// Supabase client initialization
const supabaseUrl = 'https://codjpvcfsodohbsmmxap.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGpwdmNmc29kb2hic21teGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNTgzOTksImV4cCI6MjA2MzgzNDM5OX0.6X2YcPwh0mbOkMC1UXDIlMorNOYNwi_i2VZQYUureX4';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// DOM elements
const discordLoginBtn = document.getElementById('discord-login');
const signOutBtn = document.getElementById('sign-out');
const userDataSection = document.getElementById('user-data');
const userInfoDiv = document.getElementById('user-info');
const resultDiv = document.getElementById('result');

// Discord login
discordLoginBtn.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'discord',
        options: {
            redirectTo: window.location.origin + '/auth/callback'
        }
    });

    if (error) {
        console.error('Σφάλμα σύνδεσης:', error);
        resultDiv.textContent = `Σφάλμα: ${error.message}`;
    }
});

// Sign out
signOutBtn.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error('Σφάλμα αποσύνδεσης:', error);
    } else {
        userDataSection.style.display = 'none';
        discordLoginBtn.style.display = 'block';
        signOutBtn.style.display = 'none';
        resultDiv.textContent = '';
    }
});

// Check auth state
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
        discordLoginBtn.style.display = 'none';
        signOutBtn.style.display = 'block';
        userDataSection.style.display = 'block';
        updateUserInfo(session.user);
    }
});

// Update user info
function updateUserInfo(user) {
    userInfoDiv.innerHTML = `
        <p><strong>ID:</strong> ${user.id}</p>
        <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
    `;
}

// Button handlers
document.getElementById('get-name').addEventListener('click', async () => {
    const { data, error } = await supabaseClient
        .from('credentials')
        .select('name')
        .eq('user_id', (await supabaseClient.auth.getUser()).data.user.id)
        .single();

    if (error) {
        resultDiv.textContent = `Σφάλμα: ${error.message}`;
    } else {
        resultDiv.textContent = `Όνομα: ${data.name}`;
    }
});

document.getElementById('get-email').addEventListener('click', async () => {
    const { data, error } = await supabaseClient
        .from('credentials')
        .select('email')
        .eq('user_id', (await supabaseClient.auth.getUser()).data.user.id)
        .single();

    if (error) {
        resultDiv.textContent = `Σφάλμα: ${error.message}`;
    } else {
        resultDiv.textContent = `Email: ${data.email}`;
    }
});

document.getElementById('get-password').addEventListener('click', async () => {
    const { data, error } = await supabaseClient
        .from('credentials')
        .select('password')
        .eq('user_id', (await supabaseClient.auth.getUser()).data.user.id)
        .single();

    if (error) {
        resultDiv.textContent = `Σφάλμα: ${error.message}`;
    } else {
        resultDiv.textContent = `Κωδικός: ${data.password}`;
    }
});
