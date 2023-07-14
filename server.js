const express = require('express');
const app = express();
const { Storage } = require('@google-cloud/storage');
const Multer = require('multer');

const path = require('path');
const port = 3000; // Change to the desired port number
const cors = require('cors');

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

app.use(
    cors({
      origin: 'http://localhost:4200',
      methods: 'GET,POST',
      allowedHeaders: 'Content-Type, Authorization',
    })
  );
  
const storage = new Storage({
  keyFilename: path.join(__dirname, 'google-cloud-key.json'), // Path to your service account key JSON file
  projectId: 'xxxxxxxxxxx', // Your Google Cloud project ID
});

const bucketName = 'viking_images'; // Your Google Cloud Storage bucket name
const bucket = storage.bucket(bucketName);
// Configure multer
// const multer = Multer({
//   storage: Multer.memoryStorage(),
//   limits: {
//     fileSize: 5 * 1024 * 1024, // Max file size is 5MB
//   },
// });

const upload = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Max file size is 5MB
  },
});

app.use(express.json());

app.post('/api/register', async (req, res) => {
  const { token, formData } = req.body;
  console.log(req.body.formData.UserEmailId);
  try {
    // Implement your reCAPTCHA verification logic here
    // Verify the reCAPTCHA token using the reCAPTCHA Enterprise API or libraries
    
    // If reCAPTCHA verification is successful, save the form data to the Google Cloud Storage bucket
    const filename = `login_${req.body.formData.UserEmailId}.json`;
    const file = bucket.file(filename);
    
    await file.save(JSON.stringify(formData));

    console.log('Registration data saved successfully');
    res.status(200).json({ message: 'Registration data saved successfully' });
  } catch (error) {
    console.error('Error saving registration data:', error);
    res.status(500).json({ message: 'Error saving registration data' });
  }
});

app.post('/api/login', async (req, res) => {
  
  console.log(req.body.UserEmailId);
  const UserEmailId = req.body.UserEmailId;
  const password=req.body.password;

  try {
    // Implement your logic to verify the login credentials

    if (!UserEmailId) {
      console.log('UserEmailId is missing');
      console.log(req.body);
      res.status(400).json({ message: 'UserEmailId is missing' });
      return;
    }

    // Retrieve the necessary data from the Google Cloud Storage bucket based on the login information
    const filename = `login_${UserEmailId}.json`;
    const file = bucket.file(filename);
    const [data] = await file.download();
    console.log(data.toString());

    // Validate the password against the stored data
    const storedData = JSON.parse(data.toString());
    console.log('rajatesting - '+storedData);
    if (storedData.password === password) {
      console.log('Login successful');
      res.status(200).json({ message: 'Login successful' });
    } else {
      console.log('Invalid email or password');
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).send('Error logging in');
  }
});

app.post('/api/admin', async (req, res) => {
  
  console.log(req.body.UserEmailId);
  const UserEmailId = 'admin@gmail.com';
  const password=req.body.password;

  try {
    // Implement your logic to verify the login credentials

    if (!UserEmailId) {
      console.log('UserEmailId is missing');
      
      res.status(400).json({ message: 'UserEmailId is missing' });
      return;
    }

    // Retrieve the necessary data from the Google Cloud Storage bucket based on the login information
    const filename = `login_${UserEmailId}.json`;
    const file = bucket.file(filename);
    const [data] = await file.download();
    

    // Validate the password against the stored data
    const storedData = JSON.parse(data.toString());
    
    if (storedData.password === password) {
      console.log('Login successful');
      if (!res.headersSent) // if doesn't sent yet
    res.status(200).send({ "routeid": "/adminDashboard" })
      
      
      return;
    } else {
      console.log('Invalid email or password');
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).send('Error logging in');
  }
});

// Define the API endpoint for file upload
app.post('/api/upload', upload.single('file'), (req, res, next) => {
  const file = req.file;
  
  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  const fileName = file.originalname;
  const bucket = storage.bucket(bucketName);
  const blob = bucket.file(fileName);

  const blobStream = blob.createWriteStream({
    resumable: false,
    gzip: true,
  });

  blobStream.on('error', (err) => {
    console.error(err);
    next(err);
  });
  blobStream.on('finish', () => {
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
    res.status(200).send(publicUrl);
  });

  blobStream.end(file.buffer);
});


// Define the API endpoint to fetch image URLs
app.get('/api/images', async (req, res, next) => {
  try {
    const prefix = 'CAR'
    const [files] = await storage.bucket(bucketName).getFiles({
      prefix: prefix,
    });
    
    const imageUrls = files.map((file) => {
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${file.name}`;
      return publicUrl;
    });

    res.json(imageUrls);
  } catch (error) {
    console.error(error);
    next(error);
  }
});


// Define the API endpoint to handle image upload and saving car information
// app.post('/api/cars', upload.single('image'), async (req, res, next) => {
//   try {
    
    

// const file = req.file;
// const { name, price } = req.body;
// const fileName = req.file.originalname;
// const destinationFile = storage.bucket(bucketName).file(fileName);

// const writeStream = destinationFile.createWriteStream({
//   metadata: {
//     contentType: file.mimetype,
//   },
// });

// writeStream.on('error', (error) => {
//   console.error('Error uploading file:', error);
//   next(error);
// });

// writeStream.on('finish', () => {
//   // Construct the image URL
//   const imageUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
//   const carData = {
//     name,
//     price,
//     imageUrl,
//   };
//   // Convert the JSON object to a string
//   const carDataString = JSON.stringify(carData);

//   // Upload the car data as a file to Google Cloud Storage
//   await storage.bucket(bucketName).file(fileName).save(carDataString, {
//     metadata: {
//       contentType: 'application/json',
//     },
//   });

//   // Save car information along with the image URL in your database or perform any other desired action
//   // Example: Assuming you have a database connection named "dbConnection"
//   // const car = { name, price, imageUrl };
//   // await dbConnection.save(car);

//   res.status(201).json({ message: 'Car information and image saved successfully' });
// });

// writeStream.end(file.buffer);

// //     const file = req.file;    
// //     const { name, price } = req.body;
// //     const fileName = req.file.originalname;  

// //     // Upload the image file to Google Cloud Storage
  

// //     await storage.bucket(bucketName).upload(file.buffer, {
// //       destination: fileName,
// //       metadata: {
// //         contentType: file.mimetype,
// //       },
// //     });
    
// // // Construct the image URL
// // const imageUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

// // // Save car information along with the image URL in your database or perform any other desired action
// // // Example: Assuming you have a database connection named "dbConnection"
// // // const car = { name, price, imageUrl };
// // // await dbConnection.save(car);

// res.status(201).json({ message: 'Car information and image saved successfully' });
// } catch (error) {
// console.error(error);
//  next(error);
// }
// });



app.post('/api/cars', upload.single('image'),async(req, res, next) => {

  try {
    console.log(req.file);
    const file = req.file;
    const { name, price } = req.body;
    const fileName = req.file.originalname;

    // Construct the image URL
    const imageUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    // Create a JSON object combining the car information and image URL
    const carData = {
      name,
      price,
      imageUrl,
    };

    // Convert the JSON object to a string
    const carDataString = JSON.stringify(carData);

    // Upload the car data as a file to Google Cloud Storage
    await storage.bucket(bucketName).file(fileName).save(carDataString, {
      metadata: {
        contentType: 'application/json',
      },
    });

    res.status(201).json({ message: 'Car information and image saved successfully' });
  } catch (error) {
    console.error(error);
    next(error);
  }


});
