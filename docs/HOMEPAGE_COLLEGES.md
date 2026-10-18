# Homepage Delhi NCR showcase

Reviewed on 18 October 2026. The homepage displays a deliberately selected group of established Delhi NCR MBA/PGDM institutions, not an exact ranking or a claim that these are the only leading colleges. No placement, fee or admission-probability claim is made in the cards.

| Display order | Institution | Evidence and route |
| --- | --- | --- |
| 1 | Department of Management Studies, IIT Delhi | IIT Delhi is #4 in NIRF Management 2025, the highest Delhi NCR institution in that published table. The card opens the specific DMS MBA catalogue record `ncr-iit-delhi-dms`. Its photograph is labelled as a view of IIT Delhi’s shared campus, not a claim to show the DMS classroom. |
| 2 | Management Development Institute, Gurgaon | MDI is #9 in NIRF Management 2025 and its official site identifies its Gurugram campus and PGDM provision. Route: `ncr-mdi-gurgaon`. |
| 3 | Faculty of Management Studies, University of Delhi | Its official site verifies the Delhi campus and full-time MBA. FMS is included as an established Delhi MBA school; it is not assigned a separate NIRF rank. Route: `ncr-fms-delhi`. |

Primary selection sources checked:

- https://www.nirfindia.org/Rankings/2025/ManagementRanking.html
- https://www.nirfindia.org/nirfpdfcdn/2025/pdf/Report/IR2025_Report.pdf
- https://mdi.ac.in/ (identifies Gurugram location, #9 NIRF 2025 and current postgraduate admissions)
- https://www.fms.edu/ (MBA Full-Time and New Delhi contact address)
- https://dms.iitd.ac.in/ (official departmental destination; homepage fetch timed out during this check, so no new claim is inferred from that fetch)

The NIRF 2026 table could not be verified during this pass. The cards contain no ranking year or numeric rank, and the 2025 evidence above remains explicitly dated.

The order is explicit in `src/data/featuredNcrColleges.js`. It must not regress to a database `tier/name/limit(3)` query, which previously pulled IIM Ahmedabad into the Delhi NCR showcase. Existing institution detail pages and programme evidence remain the source for fees, eligibility and admissions dates.

The user-approved FMS photograph is retained. IIFT Delhi’s entrance photograph and IIM Ahmedabad are removed from the homepage showcase. They are not deleted from other supported directory/legacy views.

## MDI photography

- Original: https://commons.wikimedia.org/wiki/File:MDI_Panoramic.jpg
- Author: Iceman7676, own work; public-domain release confirmed on the original file page and Commons metadata.
- Campus: MDI Gurgaon, not MDI Murshidabad.
- Date: 23 November 2009.
- Original dimensions: 500 × 158. Converted to WebP at native size, with no artificial upscaling or generated replacement details. The wide 12:5 card crop keeps most of the panorama in view.
- Credits, original URL, source date, retrieval date and SHA-256 are in `public/assets/colleges/manifest.json`; the component displays the credit/source and reuse terms.
