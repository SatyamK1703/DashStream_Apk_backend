import mongoose from 'mongoose';

const instagramSchema = new mongoose.Schema({
    reelPreviewImage: {
        type: String,
    },
    reelName: {
        type: String,
    },
    reelLink: {
        type: String,
    },});

const InstagramReels = mongoose.model('Instagram', instagramSchema);
export default InstagramReels;