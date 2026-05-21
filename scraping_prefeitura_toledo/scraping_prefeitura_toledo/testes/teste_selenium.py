from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.edge.service import Service
from webdriver_manager.microsoft import EdgeChromiumDriverManager
import time

options = Options()
options.add_argument("--start-maximized")

service = Service(EdgeChromiumDriverManager().install())

driver = webdriver.Edge(service=service, options=options)

driver.get("https://www.google.com")

time.sleep(5)

driver.quit()

print("Selenium abriu o navegador com sucesso.")
