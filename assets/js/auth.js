async function login(event){

    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if(error){

        alert('E-mail ou senha inválidos');
        return;
    }

    window.location.href = 'pages/dashboard.html';
}