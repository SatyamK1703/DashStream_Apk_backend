import mongoose from 'mongoose';

const instagramSchema = new mongoose.Schema({
    reelPreviewImage: {
        public_id: String,
        url: String,
    },
    reelName: {
        type: String,
        required: [true, 'Reel name is required'],
    },
    reelLink: {
        type: String,
        required: [true, 'Reel link is required'],
    },
}, {
    timestamps: true,
});

const InstagramReels = mongoose.model('Instagram', instagramSchema);
export default InstagramReels;
