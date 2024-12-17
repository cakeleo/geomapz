// server/config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Validate environment variables
const requiredEnvVars = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Force https
});

// Test the configuration
async function testCloudinaryConnection() {
  try {
    const result = await cloudinary.api.ping();
    console.log('Cloudinary connection successful:', result);
  } catch (error) {
    console.error('Cloudinary connection failed:', error);
    throw error;
  }
}

// Create upload preset if it doesn't exist
async function setupUploadPreset() {
  const presetName = 'geomap_preset';
  
  try {
    await cloudinary.api.create_upload_preset({
      name: presetName,
      folder: "geomap",
      allowed_formats: "jpg,png,gif,webp",
      max_file_size: 5000000, // 5MB
      transformation: [
        { width: 1000, height: 1000, crop: "limit" }, // Max dimensions
        { quality: "auto" } // Automatic quality optimization
      ]
    });
    console.log('Upload preset created successfully');
  } catch (error) {
    if (error.error.http_code !== 409) { // 409 means preset already exists
      console.error('Error creating upload preset:', error);
      throw error;
    }
  }
}

// Initialize Cloudinary setup
async function initCloudinary() {
  await testCloudinaryConnection();
  await setupUploadPreset();
}

initCloudinary().catch(console.error);

export default cloudinary;

// Export helper function for image upload
export const uploadImage = async (file, userId) => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: `geomap/${userId}`,
      upload_preset: 'geomap_preset'
    });
    
    return {
      publicId: result.public_id,
      url: result.secure_url,
      thumbnailUrl: result.secure_url.replace('/upload/', '/upload/w_200,h_200,c_fill/')
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};