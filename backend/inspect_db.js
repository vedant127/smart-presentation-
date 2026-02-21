import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const inspect = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const PresentationType = mongoose.model('PresentationType', new mongoose.Schema({}, { strict: false }));
    const type = await PresentationType.findOne({ name: /Feasibility Study/i });
    if (type) {
        console.log('NAME:', type.name);
        console.log('ID:', type._id);
        console.log('SECTIONS:', JSON.stringify(type.sections, null, 2));
    } else {
        console.log('Not found');
    }
    await mongoose.disconnect();
};

inspect();
