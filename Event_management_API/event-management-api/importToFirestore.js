import admin from "firebase-admin";
import fs from "fs";

// Khởi tạo Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert("./donatebloodv1-firebase-adminsdk-62d1u-bf4df95297.json"),
});

const db = admin.firestore();

// Đọc file JSON
const data = JSON.parse(fs.readFileSync("users.json", "utf-8"));
const eventsArray = Array.isArray(data) ? data : data.users;

async function importData() {
    const batch = db.batch();
    const eventsRef = db.collection("users");

    if (!Array.isArray(eventsArray)) {
        console.error("❌ Lỗi: Dữ liệu JSON không đúng định dạng!");
        return;
    }

    eventsArray.forEach((user) => {
        const newDoc = eventsRef.doc();
        batch.set(newDoc, {
            ...user,
            
            dob: user.dob? admin.firestore.Timestamp.fromDate(new Date(user.dob)): null
        });
    });

    await batch.commit();
    console.log("✅ Dữ liệu đã được import thành công!");
}

importData();
