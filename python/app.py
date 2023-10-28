import io
import requests
import tabula
import os
import time
from img2table.document import Image as TableImage
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import cv2
from pytesseract import Output, pytesseract
from flask import Flask, request, jsonify
import tempfile
from flask_cors import CORS

app = Flask(__name__)

CORS(app, resources={r"/api/*": {"origins": "*"}})

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg'}



def get_table_bounding_box(image):
    
    image_table = TableImage(image, detect_rotation=False)
    main_image = Image.open(image).convert("RGB")
    
    tables = image_table.extract_tables()
    ocr_data = []
    for table in tables:
        bounding_boxes = {
          "left": table.bbox.x1,
          "top": table.bbox.y1, 
          "right": table.bbox.x2,
          "bottom": table.bbox.y2
        }
        
        cropped_image = main_image.crop([bounding_boxes['left'],bounding_boxes['top'],bounding_boxes['right'],bounding_boxes['bottom']])
        image_array = np.array(cropped_image)
        gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
        extracted_text = pytesseract.image_to_string(gray,config='— oem 3 — psm 10',lang='eng')

        
        
        # ocr_data.append({"word": extracted_text, "bounding_box": bounding_boxes,"table":True})
        ocr_data.append({"word": extracted_text, "bounding_box": bounding_boxes,"table":True})
        
    
    return ocr_data


def get_tables_data(path):
  read_image= cv2.imread(path,0)
  image_height, image_width = read_image.shape

  convert_bin, grey_scale = cv2.threshold(read_image, 128, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
  grey_scale = 255 - grey_scale
  # grey_graph = plt.imshow(grey_scale, cmap='gray')
  # plt.show()

  # Calculate the length for the horizontal kernel, which is 1% of the image width
  length = np.array(read_image).shape[1] // 100

  # Create a horizontal kernel using the calculated length and a width of 1 pixel
  horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (length, 1))

  horizontal_detect = cv2.erode(grey_scale, horizontal_kernel, iterations=3)
  hor_line = cv2.dilate(horizontal_detect, horizontal_kernel, iterations=3)
  # plotting = plt.imshow(horizontal_detect, cmap='gray')
  # plt.show()

  vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, length))
  vertical_detect = cv2.erode(grey_scale, vertical_kernel, iterations=3)
  ver_lines = cv2.dilate(vertical_detect, vertical_kernel, iterations=3)
  # show = plt.imshow(vertical_detect, cmap='gray')
  # plt.show()

  # Create a 2x2 rectangular structuring element
  final = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))

  # Combine the 'ver_lines' and 'hor_line' images with equal weights
  combine = cv2.addWeighted(ver_lines, 0.5, hor_line, 0.5, 0.0)

  # Erode the complement of 'combine' image using the 'final' structuring element for 2 iterations
  combine = cv2.erode(~combine, final, iterations=2)

  # Apply Otsu's thresholding to 'combine' to get a binary image
  thresh, combine = cv2.threshold(combine, 128, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)

  # Assuming you have 'combine' defined elsewhere
  cont, _ = cv2.findContours(combine, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

  def get_boxes(num, method="left-to-right"):
      invert = False
      flag = 0
      
      # Check the specified method and update flags accordingly
      if method == "right-to-left" or method == "bottom-to-top":
          invert = True
      if method == "top-to-bottom" or method == "bottom-to-top":
          flag = 1
      
      # Calculate bounding rectangles for each contour in 'num'
      boxes = [cv2.boundingRect(c) for c in num]
      
      # Sort contours and bounding boxes based on the specified method
      (num, boxes) = zip(*sorted(zip(num, boxes), key=lambda b: b[1][0], reverse=invert))
      
      return (num, boxes)

  # Call the 'get_boxes' function with the 'cont' contours and the specified method
  cont, boxes = get_boxes(cont, method="top-to-bottom")

  final_box = []

  count = 0
  for c in cont:
      s1, s2, s3, s4 = cv2.boundingRect(c)
      count += 1
      if (s3 < image_width-30 and s4 < image_height-30):
          # rectangle_img = cv2.rectangle(read_image, (s1, s2), (s1 + s3, s2 + s4), (0, 0, 255), 2)  # Changed color to red
          image = Image.open(path).convert("RGB")
          cropped_image = image.crop([s1, s2, s1 + s3, s2 + s4])
          image_array = np.array(cropped_image)
          gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
          extracted_text = pytesseract.image_to_string(gray,config='— oem 3 — psm 10')
          if not extracted_text.strip():
              extracted_text = pytesseract.image_to_string(gray,config='--psm 10')

          final_box.append({"box":[s1, s2, s1 + s3, s2 + s4],"text":extracted_text})
  # graph = plt.imshow(rectangle_img)
  # print(final_box)
  table_data = []
  boxes = []
  for box in final_box:
    row = []
    if box['box'][1] not in boxes:
      for ite in final_box:
        if (box['box'][1]==ite['box'][1]):
          row.append(ite)
      boxes.append(box['box'][1])
      table_data.append(row)
#   print(table_data,flush=True)
  return table_data[::-1]


@app.route('/extract-table', methods=['POST'])
def extract_table():
    
        # Check if the 'image' field is in the request
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"})

    image = request.files['image']

    # Check if the file is an allowed image type
    if image and allowed_file(image.filename):
        # Save the image to the server in the "uploads" directory
        folder_path = "uploads"  # Replace with the desired folder name

        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
            print(f"Folder '{folder_path}' created.")
        
        
        image_path = os.path.join("uploads", str(time.time())+'-'+image.filename)
        image.save(image_path)
        image_rgb = Image.open(image_path).convert("RGB")
        table_bounding = get_table_bounding_box(image_path)
        prediction_list = []
        if(len(table_bounding) != 0):
            for i, table_bounding in enumerate(table_bounding):
                cropped_image = image_rgb.crop([table_bounding['bounding_box']['left']-10,table_bounding['bounding_box']['top']-10,table_bounding['bounding_box']['right']+10,table_bounding['bounding_box']['bottom']+10])
                temp_file_name = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
                cropped_image.save(temp_file_name.name)
                table_data = get_tables_data(temp_file_name.name)
                
                prediction_list.append({"label":str('table'),"table":table_data,'text': table_bounding['word'],"box":[table_bounding['bounding_box']['left']-10,table_bounding['bounding_box']['top']-10,table_bounding['bounding_box']['right']+10,table_bounding['bounding_box']['bottom']+10]})
                cropped_image.close()
        if os.path.exists(image_path):
            os.remove(image_path)
        
        # cleaned_data = [[elem for elem in row if 'box' not in elem] for row in prediction_list[0]['table']]
        # cleaned_data = [[{'text': elem['text']} for elem in row] for row in prediction_list[0]['table']]
                # Check if prediction_list is not empty and has the expected structure
        if prediction_list and len(prediction_list) > 0 and 'table' in prediction_list[0]:
            cleaned_data = [[{'text': elem['text']} for elem in row] for row in prediction_list[0]['table']]
        else:
            cleaned_data = []
        # print(cleaned_data,flush=True)
        return jsonify({"message": "Successfully extracted the table from the image","table":cleaned_data,"page":image.filename})

    return jsonify({"error": "Invalid image file format"})





if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5151)