// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const nodemailer = require("nodemailer");

// const app = express();
// const PORT = process.env.PORT || 5000;

// app.use(cors());
// app.use(express.json());

// // ✅ Setup transporter globally
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // ✅ Verify transporter once, on server startup
// transporter.verify((error, success) => {
//   if (error) {
//     console.error("❌ Transport error:", error);
//   } else {
//     console.log("✅ Server is ready to send messages");
//   }
// });

// // Health check
// app.get("/", (req, res) => {
//   res.send("Server is running");
// });

// // Contact route
// app.post("/api/contact", async (req, res) => {
//   const { name, email, message } = req.body;

//   if (!name || !email || !message) {
//     return res.status(400).json({ error: "Please fill all fields" });
//   }

//   try {
//     // 1️⃣ Email to yourself
//     const adminMail = {
//       from: `"Portfolio Bot" <${process.env.EMAIL_USER}>`,
//       to: process.env.EMAIL_USER,
//       subject: `New Portfolio Message from ${name}`,
//       text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
//     };

//     await transporter.sendMail(adminMail);

//     // 2️⃣ Auto-reply to user
//     const autoReply = {
//       from: `"Akarsh | Portfolio" <${process.env.EMAIL_USER}>`,
//       to: email,
//       subject: "Thanks for reaching out!",
//       text: `Hi ${name},\n\nThanks for your message! I’ll get back to you shortly.\n\nCheers,\nAkarsh`,
//     };

//     await transporter.sendMail(autoReply);

//     res.status(200).json({ message: "Emails sent successfully!" });
//   } catch (error) {
//     console.error("❌ Email error:", error);
//     res.status(500).json({ error: "Something went wrong. Try again later." });
//   }
// });

// // Start server
// app.listen(PORT, () => {
//   console.log(`🚀 Backend running on http://localhost:${PORT}`);
// });



require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;

// Setup uploads folder and multer storage
const uploadFolder = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|ppt|pptx|jpg|jpeg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("File type not allowed"));
  }
};

const upload = multer({ storage, fileFilter });

app.use(cors());

// We need express.json for normal JSON, but for multipart/form-data multer handles it
// So remove express.json from /api/contact route, keep globally if you want
app.use(express.json());

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Transport error:", error);
  } else {
    console.log("✅ Server ready to send messages");
  }
});

// Health check
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Contact route with multer middleware to handle single file upload (name='file')
app.post("/api/contact", upload.single("file"), async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Please fill all fields" });
  }

  try {
    // Compose mail to admin with attachment if file exists
    const adminMail = {
      from: `"Portfolio Bot" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `New Portfolio Message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      attachments: [],
    };

    if (req.file) {
      adminMail.attachments.push({
        filename: req.file.originalname,
        path: req.file.path,
      });
    }

    await transporter.sendMail(adminMail);

    // Auto-reply mail to user
    const autoReply = {
      from: `"Akarsh | Portfolio" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Thanks for reaching out!",
      text: `Hi ${name},\n\nThanks for your message! I’ll get back to you shortly.\n\nCheers,\nAkarsh`,
    };

    await transporter.sendMail(autoReply);

    // Optionally delete the file after sending email (clean up)
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting uploaded file:", err);
      });
    }

    res.status(200).json({ message: "Emails sent successfully!" });
  } catch (error) {
    console.error("❌ Email error:", error);
    res.status(500).json({ error: "Something went wrong. Try again later." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
