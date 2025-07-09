require('dotenv').config();

const cloudinary = require('./config/cloudinary');
const path = require('path');

async function testUpload() {
  try {
    // Caminho de uma imagem de teste local (ajuste conforme necessário)
    const filePath = path.join(__dirname, 'test-image.jpg');
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'painelquick/test',
      transformation: [{ width: 800, height: 800, crop: 'limit' }]
    });
    console.log('Upload realizado com sucesso!');
    console.log('URL da imagem:', result.secure_url);
  } catch (error) {
    console.error('Erro ao fazer upload para o Cloudinary:', error);
  }
}

testUpload(); 