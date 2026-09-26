# AI Prompts

## Problem 1 — VibeCoder prompts

### My prompt

> This is problem one, VibeCoder prompts. Work with the AI prompts setup that I outlined in your agents folder. This is the first one, so just get that folder going and then we'll move forward.

### What was lacking from the first prompt

No follow-up was required; the request clearly identified this as Problem 1 and asked to initialize the prompt log.

## Problem 2 — Database analysis

### My prompt

> Problem two: analyze the database. Look at the database in Data slash Campus underscore Customs dot DB and try and understand all the fields in the table. I'm really concerned with catalog, inventory, and users. Also create a file in Output slash Harness dot MD. Write down each table and its fields and write down a short line on why each of those fields matters for the shop or the chatbot that I'll end up creating. This harness is going to grow in later problems to add in stuff about the models, tools, safety, and different specs.

### What was lacking from the first prompt

No follow-up was required; the request named the database, emphasized the key tables, and specified the output file and field-by-field explanations.

## Problem 3 — Campus Customs website

### My prompt

> Now problem three, build the Campus Customs website. I want you to scaffold a React plus Vite plus TypeScript front end for Campus Customs. Make sure to include a nav bar at the top that links to the main pages. The main pages include Home, Products, About Us, Login, and Create Account.
>
> make sure ot pull the campus customs style wording from yalebulldogblue.com for Home and About Us, but write pages in your own voice (just dotn copy exactly)
>
> On the products page, I want you to show product images from the catalog. You can use the image paths in the database. Also include some of the basic product info, like the name, price, and also a short description. Make sure these products open in a single item page. I want this page to have a large image on one side, full product text on the other, along with the description, price, sizes, slash stock, when they are available from the database. When the user clicks on a card on products, it should take them to the shopper there. Also make sure to add a chat interface in the bottom right of the site. This can be a floating chat panel, but it doesn't need to talk to the agent yet. A stub that will call your backend later is enough for this problem. You will need a small API soon to read the database. It's fine to start a simple FastAPI app in backend slash main.py just to serve products and images. Then we can grow it later in the next problem.

### What was lacking from the first prompt

The first prompt did not specify the Python environment setup or whether `hw4` should be a standalone Git repository, so this follow-up clarified those needs.

### Follow-up prompt

> make sure that you meet the requirements of the venv in agents.md and also is this hw4 a git repo bc i will be pushing once everythig is done

This follow-up asks for the project venv setup and Git readiness, which were not specified in the original website prompt.

> can you just make a repo rooted at hw4

This follow-up specifies that the repository should be initialized directly in `hw4`.

> so is this one separate from teh school/projects ones

This follow-up asks how the new nested repository relates to the existing parent repository; the previous response did not explain that relationship.

## Problem 4 — Create account and login

### My prompt

> Now we're on problem four, create account and login. First, I want you to build a normal create account slash login flow. So for the create account, they're going to need their first name, last name, email, and a password. Also adding a little confirm password will also be something nice to add. And then for the login, it's just going to be their email and password. I want new accounts to go into the users table. Make sure to store passwords securely so any hackers can't access them. It might be good to hash and also add a salt. The seed database already has a test user you can use while building. So the email for that is test at campuscustoms.yale.edu, and the password is just password, all lowercase for both the email and the password. Confirm you can log in as that user and that a brand new account you create also works. Make sure to update the harness with how our authentication works, basically just what you store for a user and how the passwords are protected.

### What was lacking from the first prompt

No follow-up was required; the prompt specifies the account fields, password handling, test credentials, requested checks, and harness update.

## Problem 5 — Pydantic AI Agent Backend

### My prompt

> Now we're on problem five, Pydantic AI Agent Backend. For this problem, you're going to build the shop chatbot as a Pydantic AI agent behind FastAPI. This is going to be plugged into my front-end chat widget. So put the API app in backend slash main.py. This file will be ran with Uvicorn. Make sure to keep the agent as four files next to it. This is going to be the prompts/prompt.md, agent.py, tools.py, and models.py. In main.py, make sure to expose a chat route, so a message from the website returns a reply from the agent, and whatever else you would need from the product or cost. Make sure to put the Campus Customs Voice and Safety Basics into the prompt.md. You will expand tools and safety later. Start or update types in models.py for chat replies or product cards as needed. In the harness, I want you to note how the front end talks to FastAPI and how the agent is loaded. Also make sure the backend runs from the backend folder using this terminal command.
>
> ```sh
> uvicorn main:app --reload --port 8000
> ```

### What was lacking from the first prompt

No follow-up was required; the prompt names the agent files, endpoint, prompt content, harness update, and launch command.

## Problem 6 — Tools, Product Info, In Stock

### My prompt

> This is great. Now I want you to either confirm or add in the necessary requirements to give the agent tools to look up real information from the database. So I want the agent to be able to look up things like product description, price, how many are in stock, and by size when the customer asks for a given size. The agent must use the database, make sure it doesn't invent prices or quantities. If a size is out of stock, the agent should say so very clearly. Also make sure that if it is necessary to expand the prompt.md so the agent knows to call these tools for price and stock questions. Also add or update any of the return types needed in models.py. Also, if it's necessary, update the harness to list out each tool and explain which model fields you choose for lookup results and why. If some of these tools have already been implemented, don't do unnecessary work and just state that they have been implemented. If they have not, then make sure to build them out and then do the necessary steps.

### What was lacking from the first prompt

The request specified the tool and stock requirements, but did not identify them as a separate numbered problem. This follow-up clarifies that they belong to Problem 6, titled “Tools, Product Info, In Stock.”

### Follow-up prompt

> By the way, the step to build out the Pydantic agent was problem number five: Pydantic AI agent backend, and the last prompt that I just sent you about the different tools for the agent was problem six: tools, product info, in stock. Make sure the AI prompts Markdown captures that.

The earlier tool request was recorded as a follow-up under Problem 5; this clarification identifies it as the first prompt of Problem 6 and gives the problem title.

## Problem 7 — Chat search that updates the page

### My prompt

> Now we're on problem seven, chat search that updates the page. This is going to be a new feature to the site. When a customer asks about a type of item, they might ask, What hoodies do you have? I want the agent to search the catalog and the website should dynamically show those matching items as different product cards. The cards should include the image, the name, the price, and a short description of the info of the product. I want this to be made using an API contract where the agent returns structured product matches and then the front end renders them on the website. After the dynamic product cards are loaded with the new feature, I want the same single item page behavior that you built out in problem three still works. So each product card, including the ones the chat just put on the page, should still open in that detail view with the large image plus the full info when it is clicked. Make sure to update the prompt.md and the harness, so it's very clear how the search results reach the page.

### What was lacking from the first prompt

No follow-up was required; the prompt defines the chat search behavior, product-card content, API contract, existing detail-page behavior, and documentation updates.

## Problem 8 — Customer memory

### My prompt

> All right, now on problem eight, customer memory. When a shopper is logged in, I want you to save their chat history in the database in an appropriate table and then reload it when they return. The agent should know who is chatting with them. They should know their name and their email. Put that in the agent deps or an equivalent clear pattern or tool that the agent can call. Also pass along enough of the page context that if someone's on a product page and asks, Do you have this in pink? the agent knows which item they mean. You can also put this code into the agent context. Also guests can still chat, but history needs to be persistent for logged-in users. Document all of this in the harness and talk about how the user chat history is stored, what customer fields the agent sees, and how the page context is passed.

### What was lacking from the first prompt

No follow-up was required; the prompt identifies account-scoped chat persistence, returning-user history, agent profile context, current product-page context, guest behavior, and harness documentation.

## Problem 9 — Usability improvements

### My prompt

> We are now on problem number nine, usability improvements. I'm going to give you a few different front-end and back-end usability improvements, and then I want you to implement them. After you implement them, I want you to write to the output folder a usability Markdown, and within each of those explain the improvement that was added and why it helps a Campus Custom Shopper or the business. I also want you to segment the improvements as either a front-end or back-end improvement.
>
> One of the first improvements I want you to add is make sure that the chatbot is rendering its replies properly as Markdown.
>
> Another improvement is that when I logged into the test user, it already showed a set of prompts and replies. I would assume these were some of the initialized system prompts, and so I want some of those to not show up to the user. And when you remember the context from prior chats with the user, that's fine, but just make sure that some of these earlier ones don't show up. Like right now I see a chat that says, Do you have this in pink? question mark, which I don't believe I ever asked.
>
> I also want you to add a cart feature to the site. The cart should work for both a guest user and a logged-in user. When the user is logged in, the cart should be saved when they come back and re-login. The user should be able to add items to the cart and delete items from the cart. It should show both the unit price and total price of a given item that's in their cart, and it should also show the total price for the cart as a whole. You don't need to add a checkout feature just yet, but make sure that I can at least open and view the cart. Make sure that at the top banner, to the left of the logged-in user or the login sign, there should be a cart symbol that shows the number of items that are currently in the user's cart.
>
> I also want you to add in the sort and filter option. So I want to be able to sort by alphabetical, lowest to highest, and I also want to sort by price from lowest to highest, and then you can also add any standard sorting features as well.
>
> Make sure to also expand the filtering within this too. I want to be able to filter by different sizes and colors in addition to the current filter by item type.
>
> The last improvement I want you to incorporate is so that when I am using the agent to chat about a product that I am currently viewing on the page, after it replies, it returns me from the page and puts me back into the search tab showing products. But I want to stay on the tab with that given product so that I can continue having the discussion and looking at all the other features of it.

### What was lacking from the first prompt

No follow-up was required; the prompt lists the requested chat, history, cart, catalog controls, and product-page behavior, along with the documentation format.

## Problem 10 — Website styling

### My prompt

> now probelm 10: style the website.
>
> i want you to make this much more like a real site. make sure that their are fonts, colors, hierachy, motion, product presentation, the chat needs to have an authentic feel. Make sure ot be more imagniative and innovative and i will award you with more points. make sure to add in some yale handsome dan little clip art like figures in different places. here is a reference image to build from. also make sure to add in some kind of dopamine affect for when the user adds something to their cart. this could be like a little confettit effect or something.
>
> write output/design.md to explain what you changed and why it will help customers stick around and buy. this should be VERY concise, concrete, and short

### What was lacking from the first prompt

No follow-up was required; the prompt names the visual direction, mascot details, cart feedback, reference image, and concise design documentation.

## Problem 11 — Site testing / app check

### My prompt

> Now I want you to test the live site and document it in output slash app underscore check dot HTML. This is going to be a page that you can double-click open and include some clear screenshots and short captions for the three following items that I'm going to describe. The first is the chat checking the inventory level of an item. I want it to make sure that it shows the honest stock price from the database. The second is a dynamic search result cards appearing after a category question. This could be something about hoodies. And the third is going to be one of the usability features that you just added in problem nine. Make sure that the HTML is easy for someone to grade and evaluate. There should be a heading for each of the checks, a screenshot, and one or two sentences describing what the screenshot proves. Make sure to put the screenshot image files in the output slash app underscore check underscore images folder and link them from the app underscore check dot HTML with the relative paths. For example, one of the paths might be app underscore check underscore images slash inventory dot PNG. By the way, this is problem number 11, site testing or app check. Make sure that you open the browser and take screenshots of the things that are necessary so that you can accomplish this task.

### What was lacking from the first prompt

No follow-up was required; the prompt specifies all three checks, screenshot storage, relative image links, and the HTML report format.

## Problem 12 — Audit trail, safety, and finished harness

### My prompt

> problem 12: audit tail, safety, finish harness,
>
> keep an append only output/audit_trail.json of agent-loop activity (time, tool name, short args/results, stop reason) do not wipe between runs. also add soem safety rules to give the agent in prompts/prompt.md
>
> finsih the harness so it is clear hwo the system works. make sure to add an exec summary as well for a manager to explain the models, tools, safety rules, and specs (loop limits, results caps, models, how to run front + back)

### What was lacking from the first prompt

The prompt specifies the audit fields, persistence requirement, safety additions, and manager summary. The exact audit serialization format and numerical loop limits were left as implementation choices.

## Problem 13 — Push to GitHub and submit the URL

### My prompt

> problem 13: push to github and submit the url
>
> push teh code in my hw4 fcolder to a public github repo. I will handle submitting it to canvas myself. dont put the real .env or campus_customs.db
>
> use gitignore and include .env.example with placeholders
>
> this is the expected layout in the image but you can include any other files that will be necessary for the program to run correclty
>
> the readme shoudl explain how to run it after placing the data pack

The attached reference images specified the following repository layout and a separate local data pack:

```text
hw4/
├── AI_prompts.md
├── requirements.txt
├── .env.example
├── .gitignore
├── README.md
├── frontend/
├── backend/
│   ├── main.py
│   ├── agent.py
│   ├── models.py
│   ├── tools.py
│   └── prompts/
│       └── prompt.md
└── output/
    ├── harness.md
    ├── design.md
    ├── usability.md
    ├── app_check.html
    ├── app_check_images/
    └── audit_trail.json

Local-only data pack (not in Git):
data/
├── campus_customs.db
└── products/
```

### What was lacking from the first prompt

The requested layout already included `AI_prompts.md`, but the implementation omitted the Problem 12 and Problem 13 entries. The final follow-up below requests that correction. Other follow-ups clarify the repository name and changed GitHub username.

### Follow-up prompts

> rename repo to campus-customs-agent-storefront

> wait dont rename

The rename request was canceled, so the repository remains named `hw4`.

> i updated my username for git so make sure it still owrks

The repository remote and README clone URL were updated to `https://github.com/mason-lewis/hw4`, and a successful push verified the connection.

> make sure to inlcude problem 12 and 13 promts and push

This follow-up adds the two missing prompt entries and requests that the updated log be pushed to GitHub.
