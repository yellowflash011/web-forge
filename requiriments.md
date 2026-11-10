COMSATS UNIVERSIT Y ISLAMABAD
CUI Tech Fest · AI Web Forge Hackathon
Problem Statement: Roshan Rozgar (راگزور نشور)
A hyper-local marketplace for skilled trade workers
Track
Venue
Duration
Full-Stack Web Development & Applied AI
Academic Block II, COMSATS University Islamabad
9:30 AM to submission deadline
1. Background
Most of Pakistan's workforce operates outside the formal economy. The Pakistan Bureau of Statistics reports
that 72.1% of non-agricultural employment is informal, and the share is higher still outside the main cities.
Skilled trade workers such as electricians, plumbers, AC technicians, carpenters and mechanics are a large
part of this group.
These workers typically find jobs through a street-corner gathering point (adda), through contractors, or by
word of mouth. Existing job portals and service apps have not reached them. They assume the user can read
comfortably, fill in typed forms, and present a CV. Many tradespeople have none of these, even when they
have decades of experience and strong reputations in their own neighbourhoods.
Households face the opposite problem. When something breaks, there is no reliable way to find a worker
who is nearby, free at that moment, competent for the specific job, and safe to let into the home. Customers
fall back on whoever a neighbour recommends, often with no information on price or quality until the work is
done.
2. Problem Statement
Design and build a web-based platform that connects households with nearby skilled trade
workers. The platform must be usable by workers with limited literacy, must help customers find
an available worker quickly, and must give customers a reasonable basis for trusting the worker
they hire.
Teams are free to decide the features, user flows, interface and technology. This document defines the
outcomes a solution must achieve and the criteria by which it will be judged. It does not prescribe how those
outcomes are achieved.
3. Required Outcomes
A valid submission demonstrates all five outcomes below, working together as a single flow, for both the
worker and the customer. Each outcome is stated as a result, not as a feature.
1. Onboarding. A trade worker can create a complete, useful profile without reading or typing into a
conventional sign-up form.
2. Discovery. A customer can find a suitable worker who is nearby and available at the time of the request.
3. Communication. The customer and the worker can communicate and agree on the job and the price, in a
way that suits a user who does not type comfortably.
CUI Tech Fest | AI Web Forge | Problem Statement
 1 / 3
4. Booking. A job can be confirmed, and the platform remains consistent about which workers are free and
which are engaged.
5. Trust. After the job, the platform captures information that helps the next customer decide.
Use of AI
Solutions are expected to apply AI (for example language models, speech recognition or image
understanding) where it removes a genuine barrier for these users: literacy, language, speed or trust. AI that
is present only for show will receive no credit. Judges will ask what would stop working if the AI component
were removed.
4. Scope and Assumptions
The solution should work for a Pakistani urban setting. Islamabad and Rawalpindi are suggested as the
default, but any city is acceptable.
Support for Urdu or Roman Urdu input is strongly encouraged. English-only solutions are permitted but
should justify the choice.
There will be no real users during the event. Seeded workers, jobs and reviews are expected. The
README must state what is seeded or simulated.
Out of scope: payment processing, identity verification against government databases, and native mobile
applications. Teams may mock these if their flow depends on them.
5. Technical Constraints
Platform. A web application that runs in a standard browser and is usable on a phone-sized screen.
Technology. Any programming language, framework, database and hosting provider may be used.
AI services. Any third-party AI API or open model may be used. Every service used must be listed in the
README.
AI coding assistants. Permitted, subject to disclosure in the README.
Originality. All project-specific code must be written during the hacking window. Open-source libraries,
UI component kits and public datasets are allowed and must be credited.
6. Deliverables
Item
Requirement
Source code
Working demo
README
Public Git repository. Commit history must begin after the official start time.
A deployed URL, or a locally running instance ready when the judges reach the team.
Setup instructions, technology stack, all AI services and tools used, what is seeded or
mocked, and known limitations.
Presentation
A live demonstration of the full flow across both roles, followed by questions from the
judges. Slides are optional.
CUI Tech Fest | AI Web Forge | Problem Statement
 2 / 3
7. Evaluation Criteria
Criterion
Technical execution
Problem understanding
and impact
Innovation and use of AI
Usability and accessibility
Presentation
Weight
30%
20%
20%
15%
15%
Description
The required outcomes work end to end in a live demonstration. The
architecture is sound and the team can explain and defend its
decisions. Reliability is valued over feature count.
The team shows a clear understanding of both user groups and the
constraints they operate under. The solution addresses a real barrier
rather than a convenient one.
Originality of the approach. AI components perform work that matters
to the user and would be missed if removed.
A low-literacy user could complete the worker flow without assistance.
Mobile-first layout, clear feedback, sensible defaults.
Clarity of the demonstration, quality of reasoning about trade-offs, and
quality of answers during questions.
Each judge scores every criterion from 1 to 10. Scores are weighted as above and averaged across judges. Parts of the
system that are mocked or hard-coded are acceptable if disclosed; presenting mocked functionality as working during
the demonstration will result in a penalty at the judges' discretion.
8. Rules
Teams must register before the hacking window opens. Changes to team composition after the start are
not permitted.
Work started before the official start time, or code copied from a prior project, will lead to disqualification.
Teams may consult mentors, documentation and online resources at any time.
Submissions received after the deadline will not be judged.
The decisions of the judging panel are final.
9. Frequently Asked Questions
Do we have to build a map, a chat system or voice input?
No. These are possible ways of achieving the required outcomes, not requirements in themselves. If a map is
the clearest way to show which workers are nearby, build one. If a different approach is better for these
users, use it and be ready to explain why.
Can we focus more on one side of the platform?
Yes, provided all five outcomes are demonstrated for both roles. Going deep on either the worker experience
or the customer experience is a legitimate strategy.
Is a deployed link mandatory?
No. A locally running instance is acceptable if it is ready when the judges arrive at your table.
Can we use a pre-built template or starter kit?
Generic boilerplate and UI kits are fine. Anything specific to this problem must be written during the event.
CUI Tech Fest | AI Web Forge | Problem Statement
 3 / 3