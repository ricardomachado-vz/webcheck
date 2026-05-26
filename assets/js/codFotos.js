const cameraIcon = document.getElementById('cameraIcon');
const fileInput = document.getElementById('fileInput');

cameraIcon.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        console.log("Arquivo selecionado:", this.files[0].name);
        // lógica para enviar ao servidor
    }
});