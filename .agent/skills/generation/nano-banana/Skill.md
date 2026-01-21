---
name: nano-banana-placeholder
description: Generates clean, themed placeholder images using Nano Banana (Gemini image model) for frontend design, landing pages, and UI mockups.
---

# Nano Banana Placeholder Image Skill 🍌

This skill helps generate **high-quality placeholder images** using the Nano Banana (Gemini Image) model.  
It is optimized for **frontend development**, **landing pages**, **SaaS UI**, **hero sections**, **cards**, **testimonials**, and **empty states**.

The images are realistic, neutral, and design-friendly—perfect for replacing stock photos during early development.

---

## When to use this skill

Use this skill when:

- Creating a **website or landing page UI**
- Designing **frontend components** (cards, banners, hero sections)
- Building **wireframes or mockups**
- You need **temporary images** before final assets
- Avoiding copyright or stock image issues
- Rapid prototyping for clients or demos

This is especially helpful for:

- SaaS websites
- Startup landing pages
- Admin dashboards
- Mobile app UI
- Portfolio projects

---

## How to use this skill

### 1. Decide the placeholder context

Identify:

- Section type (hero, feature, testimonial, blog, product)
- Mood (modern, minimal, corporate, playful)
- Aspect ratio (square, wide, portrait)

---

### 2. Write a clean Nano Banana prompt

Follow this structure:

**Prompt Formula**:
"A clean placeholder image for [CONTEXT], [DESCRIPTION OF SHAPES/COLORS], [STYLE TAGS], no text"

### Examples

- **Hero section**  
  > A clean placeholder image for a SaaS landing page hero section, abstract shapes, soft gradients, modern minimal design, neutral colors, realistic lighting, no text

- **Feature card**  
  > A clean placeholder image for a website feature card, a banana-shaped abstract object, minimal background, soft shadows, modern UI style

- **Testimonial**  
  > A clean placeholder image for a testimonial section, professional portrait silhouette, neutral background, soft studio lighting

---

### 3. Use Nano Banana API (Gemini Image)

Use your existing API setup and replace only the prompt text.

```bash
#!/bin/bash
set -e -E

GEMINI_API_KEY="$GEMINI_API_KEY"
MODEL_ID="gemini-3-pro-image-preview"
GENERATE_CONTENT_API="streamGenerateContent"

cat << EOF > request.json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "A clean placeholder image for a modern website landing page hero section, abstract banana-inspired shapes, minimal design, neutral colors, soft lighting, realistic photography style, no text"
        }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["IMAGE", "TEXT"],
    "imageConfig": {
      "image_size": "1K"
    }
  }
}
EOF

curl -X POST \
-H "Content-Type: application/json" \
"https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:${GENERATE_CONTENT_API}?key=${GEMINI_API_KEY}" \
-d '@request.json'
```
