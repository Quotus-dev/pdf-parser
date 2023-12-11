import fitz 
import os
import io
from PIL import Image, ImageDraw, ImageFont
from multiprocessing import Pool, cpu_count
import glob

def convert_pdf_to_image(input_pdf,output_directory,page_number):
    # images = convert_from_path(input_pdf)
    try:
        pdf_document = fitz.open(input_pdf)
    except Exception as e:
        # Code to handle any type of exception
        return {'type':'error','response':str(e)}
    
    # Get the page
    page = pdf_document.load_page(page_number)        
    image = page.get_pixmap(matrix=fitz.Matrix(100/100, 100/100),dpi=700)
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
        
        
class convertIntoImages:
    
    def __init__(self,input_dir,out_dir):
        # Instance attribute
        self.input_pdf = input_dir
        self.output_directory = out_dir
        # self.pool = Pool()

    def public_extract_page_from_pdf(self):        
        try:
            pdf_document = fitz.open(self.input_pdf)
        except Exception as e:
            # Code to handle any type of exception
            return {'type':'error','response':str(e)}
        
        num_processes = max(1, round(cpu_count() / 2))

        with Pool(processes=num_processes) as pool:
            # Define multiple input values as a list of tuples
            pages_to_process = [(self.input_pdf,self.output_directory,i) for i in range(pdf_document.page_count)]

            # Use the starmap function to apply the extract_pdf_images function to each input tuple
            pool.starmap(convert_pdf_to_image, pages_to_process)
        
        image_extensions = ['jpg', 'jpeg', 'png', 'gif']

        # Use glob to find all files with the specified extensions in the directory
  
        image_files = []
        for extension in image_extensions:
            pattern = os.path.join(self.output_directory, f'*.{extension}')
            image_files.extend(glob.glob(pattern))
        
        
        # Define a function to extract the page number from a file path
        def get_page_number(file_path):
            filename = os.path.basename(file_path)
            parts = filename.split('_')
            if len(parts) > 1:
                page_number = parts[1].split('.')[0]
                return int(page_number)
            return 0

        # Sort the list of image files based on the page number
        image_files.sort(key=get_page_number)
        return {'type':'response','response':image_files}
    
    def cleanup(self):
        self.pool.close()
        self.pool.join()