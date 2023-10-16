from pdf2image import convert_from_path
import os
import sys
import fitz 
import io 
from PIL import Image 

args = sys.argv[1:]
if len(args) < 2:
    print('Usage: python convert_pdf_to_images.py input.pdf output_directory')
    sys.exit(1)

input_pdf = args[0]
output_directory = args[1]

# images = convert_from_path(input_pdf)
pdf_document = fitz.open(input_pdf)

for page_number in range(pdf_document.page_count):
    # Get the page
    page = pdf_document.load_page(page_number)

    
    image = page.get_pixmap(matrix=fitz.Matrix(100/100, 100/100),dpi=250)
    # image_filename = os.path.join(output_directory, f'page_{page}.png')
    image_filename = os.path.join(output_directory, f'page_{page_number+1}.png')
    
    for img_index, img in enumerate(page.get_images(full=True)):
        # print(img_index,f'page_{page_number}_img_{img_index}.png')
        xref = img[0]
        base_image = pdf_document.extract_image(xref)
        image_data = base_image["image"]

        # Save extracted images
        image_inside_page = Image.open(io.BytesIO(image_data))
        pdf_images_per_page_path = output_directory + '/' + str(page_number+1)
        if not os.path.exists(pdf_images_per_page_path):
        # If it doesn't exist, create the folder
            os.makedirs(pdf_images_per_page_path)
            # print(f"Folder '{pdf_images_per_page_path}' created.")

            
            
        img_filename = os.path.join(pdf_images_per_page_path, f'page_{page_number+1}_img_{img_index}.png')
        image_inside_page.save(img_filename)
         

        
    image.save(image_filename)
    
    
pdf_document.close()
    
