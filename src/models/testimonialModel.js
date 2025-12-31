import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    instagramUrl: {
        type: String,
        required: [true, 'Instagram URL is required'],
        trim: true,
        validate: {
            validator: function(v) {
                return /^https?:\/\/(www\.)?instagram\.com\//.test(v);
            },
            message: 'Please enter a valid Instagram URL'
        }
    },
    thumbnail: {
        public_id: {
            type: String,
            required: [true, 'Thumbnail public_id is required'],
        },
        url: {
            type: String,
            required: [true, 'Thumbnail URL is required'],
            validate: {
                validator: function(v) {
                    return /^https?:\/\/.+/.test(v);
                },
                message: 'Thumbnail URL must be a valid URL'
            }
        },
    },
}, {
    timestamps: true,
});

const Testimonial = mongoose.model('Testimonial', testimonialSchema);
export default Testimonial;